# -*- coding: utf-8 -*-
# compare_seq.py

"""
Author: Rohak Jain
Last Date Modified: 2025-03-27
Description: 'compare_seq' performs global pairwise alignment on the specified target and inferred
query protein sequences derived from the earlier steps. Summary statistics are also identified at
the end for clarity; the final identity score is returned to the user.

"""

from Bio import Align
from Bio.Align import substitution_matrices

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

def align(target_set: dict, query, identity_ratio, verbose = True): # master function
    aligner = create_aligner()
    alignment_metadata = dict.fromkeys(['start', 'end', 'length', 'target', 'alignment'])
    alignment_metadata["length"] = 0
    '''
    [[[155 323]
    [323 324]]

    [[  0 168]
    [224 225]]]

    chunk 1: target (155-323), query (0-168)
    chunk 2: target (323-324), query (224-225)
    '''
    for target in target_set.values():
        alignments = aligner.align(target.seq, query) # update to say target.seq
        alignment = alignments[0]
        for i in range(len(alignment.aligned[0])): # parsing each chunk
            query_range = slice(alignment.aligned[1][i][0], alignment.aligned[1][i][1])

            # target_range = slice(alignment.aligned[0][i][0], alignment.aligned[0][i][1])
            # target_seq = alignment.sequences[0][target_range]
            # query_seq = alignment.sequences[1][query_range]

            if query_range.stop - query_range.start <= 10:
                continue

            align_chunk = alignment[:, query_range]
            match_elements = ''.join(str(align_chunk).splitlines()[1::2]).split()
            filtered_matches = [phrase for phrase in match_elements if not phrase.isdigit()]
            match_seq = ''.join(filtered_matches)

            start, end, length = compute_lca(match_seq, threshold=identity_ratio)
            #print(length)
            #print(int(alignment_metadata["length"]))
            if length > int(alignment_metadata["length"]):
                #print("THIS THE WINNER")
                refined_start = start + int(query_range.start)
                refined_end = refined_start + (end - start + 1)
                alignment_metadata.update({'start': refined_start, 'end': refined_end, 'length': length, 
                                           'target': target.id.replace('\u200b', ''), 'alignment': alignment})

    if verbose:
        print("Optimal Pairwise Sequence Alignment (params = gap_pen: 10.0, extend_pen: 0.5, matrix: EBLOSUM62):\n")
        print(alignment_metadata["alignment"])
        alignment_metadata["identity_pct"] = display_statistics(alignment_metadata["alignment"], verbose = verbose)
        print(f"Most Compatible Target: {alignment_metadata["target"]}")
        print(f"Maximum Continuous Length: {alignment_metadata["length"]} (query region defined by "
              f"start = {alignment_metadata["start"]}, end = {alignment_metadata["end"]})\n")
    
    return alignment_metadata


'''def helper(match_seq, identity_ratio):
    successes = 0
    for i, symbol in enumerate(match_seq):
        if symbol == "|":
            successes += 1
        
        if successes != 0 and offenses != 0:
            curr_ratio = successes / offenses
            print(curr_ratio)
            if curr_ratio < identity_ratio:
                return i
        
    return len(match_seq)'''
def create_aligner():
    # Declaring aligner attributes to exactly match those of EMBOSS Needle
    aligner = Align.PairwiseAligner()
    aligner.match_score = 1.0
    aligner.mismatch_score = 0.0
    aligner.open_gap_score = -10
    aligner.extend_gap_score = -0.5
    aligner.substitution_matrix = substitution_matrices.load("BLOSUM62")

    return aligner

def display_statistics(alignment, verbose = True):
    # Computing relevant alignment statistics
    identity = sum(1 for a, b in zip(alignment[0], alignment[1]) if a == b and a != "-")
    mismatches = sum(1 for a, b in zip(alignment[0], alignment[1]) if a != b and a != "-" and b != "-")
    gaps = sum(1 for a, b in zip(alignment[0], alignment[1]) if a == "-" or b == "-")

    if verbose:
        # Helper lambda for statistic formatting on print
        desc = lambda name, stat, length: f"{name}: {stat}/{length} ({round(stat/length * 100, 1)}%)"

        print("Summary Statistics:")
        print(f"  - Score: {alignment.score}")
        print(desc("  - Identity", identity, alignment.length))
        print(desc("  - Mismatches", mismatches, alignment.length))
        print(desc("  - Gaps", gaps, alignment.length))
        print()

    return round(identity/alignment.length * 100, 1)


'''
res = align(["MVSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFTYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYKGGASPAAPAGGVSFAFNLNSLIVGILRFHW"], 
            "NNNNNNNNNNNNNNCNGGTCTGTGTGCTGGCCCNTCACTTTGGCAAAGCACGTGTACAGTGGCCACCATGGGAGGAATGGTGTCCAAGGGCGAGGAGCTGTTCACAGGCGTGGTTCCCATTCTGGTGGAGC"
"TGGATGGCGACGTGAACGGCCACAAGTTCAGCGTGTCTGGAGAAGGCGAGGGCGACGCAACCTACGGAAAGCTGACCCTGAAGTTCATCTGCACCACCGGCAAGCTGCC"
"CGTGCCTTGGCCTACACTGGTGACCACATTCACCTACGGCGTGCAGTGCTTCAGCAGGTACCCCGACCACATGAAGCAGC"
"ACGACTTCTTCAAGTCCGCCATGCCCGAGGGCTACGTGCAGGAGAGAACCATCTTCTTTAAGGACGACGGAAACTACAAG"
"ACCAGGGCCGAGGTGAAGTTCGAGGGAGACACCCTGGTGAACAGGATCGAGCTGAAGGGCATCGACTTCAAGGAGGACGG"
"CAACATCCTGGGCCACAAGCTGGAGTACAACTACAACAGCCACAACGTGTACATCATGGCCGACAAGCAGAAGAACGGCA"
"TCAAGGTGAACTTCAAGATCAGGCACAACATCGAGGATGGCAGCGTGCAGCTGGCTGACCACTATCAGCAGAACACACCT"
"ATCGGCGACGGCCCCGTTCTGCTGCCTGACAACCACTACCTGAGCACACAGAGCGCTCTGAGCAAGGACCCCAACGAGAA"
"GAGAGATCACATGGTGCTGCTGGAATTCGTGACCGCCGCTGGCATCACACACGGCATGGACGAGCTTTATAAAGGCGGAG"
"CCAGCCCTGCTGCTCCTGCTGGAGGCGTTAGCTTCGCCTTTAACCTGAACAGCCTGATCGTGGGCATCCTGAGGTTCCAC"
"TGGTNANNTTCCTAATGAGCATGTTTGGACCAAATCAACTTGTGATACCATGCTCAAGAGGCCTCAATTATATTTGAGTT"
"TTTAATTTTATGAAAAAAAAAAAAAAAAAACGGAATTCACCCCACCAGTGNNNCTGCNATCANAAAGTNNTNGNNGGTGT"
"NGCTAATGCCCTNNNCNNCAGNATCACTANCTCGCTTTNNNCTGTCNNTTNCNANNNAANGNTNNTTTNNTCCCTAANTCCNNNNNNNNAAACTG", 0.98)
print(res)

thoughts:
- get rid of gap regions in advance (one seq missing) via .aligned
- subset alignment by target indices to get the initial chunks
- further analyze these chunks, testing for a min_identity ratio
- log any instances of dots/X to return to the user
- under these assumptions, calculate longest continuous alignment for THIS target-query combo

Minimum identity ratio:
The minimum fraction of aligned positions that must be exact or conservative matches (e.g. | or optionally .) for a region to be considered a valid alignment chunk.

For example, a value of 0.95 means at least 95% of the aligned characters must match.

Set to 1.0 to only include perfect matches. Lower values allow for mismatches or near-matches.

If your query sequence stays the same for all alignments — then yes, the absolute length of the best high-identity region is a valid and meaningful score on its own.

Because you're comparing:
“How much of this same query aligns well to each reference?”

The query is your fixed "needle" 🔍

The references are your "haystack" sequences 🪵

So the score (alignment length) tells you:

“How much of this exact query can I confidently map to this reference?”






#alignment = "||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||.||||||||||||.......................|||."
alignment = "....-----|||..||||..."
start, end, length = compute_lca(alignment, threshold=0.98)
print(f"Best region: start={start}, end={end}, length={length}")
print("Segment:", alignment[start:end+1])
'''
