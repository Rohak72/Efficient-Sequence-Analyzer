# -*- coding: utf-8 -*-
# compare_seq.py

"""
Author: Rohak Jain
Last Date Modified: 2025-03-27
Description: 'compare_seq' performs global pairwise alignment on the specified target and inferred
query protein sequences derived from the earlier steps. Summary statistics are also identified at
the end for clarity; the final identity score is returned to the user.

"""

from typing import Dict, List
from Bio import Align
from Bio.Align import substitution_matrices
from app.scripts.utils import *
import heapq

def batch_alignment_cycle(direction: str, record_id: str, orf_set: List[str], target_set: Dict[str, str], 
                          top_hits: Dict[str, List], curr_results_data: pd.DataFrame, align_threshold: float):
    max_lca, final_align_res, top_orf = 0, None, None
    for orf in orf_set:
        align_res = align(query=orf, target_set=target_set, top_hits=top_hits, identity_ratio=align_threshold)
        if align_res.get('length') > max_lca:
                max_lca = align_res.get('length')
                final_align_res = align_res
                top_orf = orf

    results_df = data_export(curr_results_data, record_id, direction, top_orf, 
                             final_align_res.get("identity_pct"), final_align_res.get("target"), "")
    final_align_res.update({'top_orf': top_orf})

    return results_df, final_align_res

def align(query: str, target_set: dict, top_hits: dict, identity_ratio: float):
    aligner = create_aligner()
    alignment_metadata = {'start': None, 'end': None, 'length': 0, 'target': None, 
                          'alignment': None, 'identity_pct': 0}

    '''
    General Body of the Alignment:
    
    [[[155 323]
    [323 324]]

    [[  0 168]
    [224 225]]]

    -> Chunk 1: target (155-323), query (0-168).
    -> Chunk 2: target (323-324), query (224-225).

    '''

    best_chunk_lca, best_start, best_end = 0, None, None
    for target_id, target_seq in target_set.items():
        # We're trying to determine how much of the target is covered by the query (ORF) -- the
        # alignment direction should reflect that.
        alignments = aligner.align(target_seq, query)
        alignment = alignments[0]

        # Compute the global identity if there's a pairwise alignment to process.
        identity_pct = 0.0 if alignment is None else float(calculate_identity_score(alignment))

        for i in range(len(alignment.aligned[0])): # Parsing each chunk!
            query_range = slice(alignment.aligned[1][i][0], alignment.aligned[1][i][1])
            align_chunk = alignment[:, query_range]

            # Helpful for viewing other components of the alignment object:
            # target_range = slice(alignment.aligned[0][i][0], alignment.aligned[0][i][1])
            # target_seq = alignment.sequences[0][target_range]
            # query_seq = alignment.sequences[1][query_range]

            # To exclude overly minimal and unlikely alignment portions:
            # if query_range.stop - query_range.start <= 10:
            #     continue

            # Extract the middle match string (comprised of |, ., or -), which will be used to
            # find the longest overlapping region in the alignment.
            match_elements = ''.join(str(align_chunk).splitlines()[1::2]).split()
            filtered_matches = [phrase for phrase in match_elements if not phrase.isdigit()]
            match_seq = ''.join(filtered_matches)
            
            # Retrieve the longest continuous alignment (LCA) parameters.
            start, end, length = compute_lca(match_seq, threshold=identity_ratio)

            # If this LCA outperforms prior align chunks, update the appropriate variables!
            if length > best_chunk_lca:
                best_chunk_lca = length
                best_start = start + int(query_range.start)
                best_end = best_start + (end - start + 1)
        
        # If the winning LCA for this ORF-target combination beats out prior targets, reassign
        # the metadata dictionary to represent the new best-fit target (and its LCA info).
        if best_chunk_lca > alignment_metadata.get('length'):
            alignment_metadata.update({'start': best_start, 'end': best_end, 'length': best_chunk_lca, 
                                       'target': target_id.replace('\u200b', ''), 
                                       'alignment': str(alignment), 'identity_pct': identity_pct})

        # Reevaluate the heap to fit in the new datapoint if its identity score is higher than the
        # min element (at index 0). Being that this is a min-heap, we only spend O(logn) time on the
        # insertion/search step as opposed to the O(n) limitation of a standard list.
        heap = top_hits[target_id.replace('\u200b', '')]
        if len(heap) < 5:
            heapq.heappush(heap, (identity_pct, best_chunk_lca, query)) # Populate heap if still vacant.
        elif identity_pct > heap[0][0]:
            heapq.heappushpop(heap, (identity_pct, best_chunk_lca, query)) # Replace if needed.
    
    # Return the final alignment result and target match for the input ORF.
    return alignment_metadata

def create_aligner():
    # Declaring aligner attributes to exactly match those of EMBOSS Needle
    aligner = Align.PairwiseAligner()
    aligner.match_score = 1.0
    aligner.mismatch_score = 0.0
    aligner.open_gap_score = -10
    aligner.extend_gap_score = -0.5
    aligner.substitution_matrix = substitution_matrices.load("BLOSUM62")

    return aligner


def compute_lca(alignment, threshold=0.98):
    coverage = len(alignment)
    best_start = best_end = max_len = 0 # Setting "optimal" variables.

    for start in range(coverage): # Test each possible starting point (i.e. modified sliding window).
        matches = total = 0
        for end in range(start, coverage): # Expand forward one symbol at a time.
            symbol = alignment[end]
            if symbol == '|':
                matches += 1
                total += 1
            elif symbol == '.' or symbol == "-":
                total += 1
            else:
                continue  # Skip non-alignment characters.

            if total == 0: # Avoid division by zero error.
                continue

            identity = matches / total # Computing current ratio.

            # If the ratio is high enough and the region is the longest we've seen, update the result.
            if identity >= threshold:
                curr_len = end - start + 1
                if curr_len > max_len:
                    max_len = curr_len
                    best_start, best_end = start, end

    # After parsing, return the start and end of the longest high-quality stretch.
    return best_start, best_end, max_len

def calculate_identity_score(alignment):
    # Computing relevant alignment statistics
    identity = sum(1 for a, b in zip(alignment[0], alignment[1]) if a == b and a != "-")
    return round(identity/alignment.length * 100, 1)
