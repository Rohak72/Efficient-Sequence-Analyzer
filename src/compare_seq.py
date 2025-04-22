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

def align(target, query, verbose = True): # master function
    aligner = create_aligner()
    alignments = aligner.align(target, query)
    heehee = alignments[0]


    print(heehee)

    identity_ratio = 0.95
    max_continuous_alignment = 0
    for i in range(len(heehee.aligned)): # parsing each chunk
        target_range = slice(heehee.aligned[0][i][0], heehee.aligned[0][i][1])
        target_seq = heehee.sequences[0][target_range]
        query_range = slice(heehee.aligned[1][i][0], heehee.aligned[1][i][1])
        query_seq = heehee.sequences[1][query_range]

        if target_range.stop - target_range.start <= 10:
            continue

        align_chunk = heehee[:, target_range]
        print(target_seq)
        print(query_seq)

        match_elements = ''.join(str(align_chunk).splitlines()[1::2]).split()
        filtered_matches = [phrase for phrase in match_elements if not phrase.isdigit()]
        match_seq = ''.join(filtered_matches)

        lca = compute_lca(match_seq, threshold=0.98)
        

        successes, offenses = 0, 0
        #length = helper(match_seq, identity_ratio)
        #print(length)
        
        print(match_seq)

        print(align_chunk)


    print()


    if verbose:
        print("Pairwise Sequence Alignment (params = gap_pen: 10.0, extend_pen: 0.5, matrix: EBLOSUM62):\n")
        print(alignments[0])
    
    return display_statistics(alignments[0], verbose = verbose)

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



align("MSGHHHHHHPSGVKTENNDHINLKVAGQDGSVVQFKIKRHTPLSKLMKAYCERQGLSMRQIRFRFDGQPINETDTPAQLEMEDEDTIDVFQQQTGGEKRKPIRVLSLFDGIATGLLVLKDLGIQVDRYIASEVCEDSITVGMVRHQGKIMYVGDVRSVTQKHIQEWGPFDLVIGGSPCNDLSIVNPARKGLYEGTGRLFFEFYRLLHDARPKEGDDRPFFWLFENVVAMGVSDKRDISRFLESNPVMIDAKEVSAAHRARYFWGNLPGMNRPLASTVNDKLELXECLEHGRIAKFSXXERLRRAQTRLNRXRXTFSRXXMNEXX", 
      "RSVTQKHIQEWGPFDLVIGGSPCNDLSIVNPARKGLYEGTGRLFFEFYRLLHDARPKEGDDRPFFWLFENVVAMGVSDKRDISRFLESNPVMIDAKEVSAAHRARYFWGNLPGMNRPLASTVNDKLELQECLEHGRIAKFSKVRTITTRSNSIKQGKDQHFPVFMNEKEDILWCTEMERVFGFPVHYTDVSNMSRLARQRLLGRSWSVPVIRHLFAPLKEYFACV", False)

'''
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

'''

def compute_lca(alignment, threshold=0.95):
    coverage = len(alignment)
    best_start = best_end = max_len = 0 # setting "optimal" variables

    for start in range(coverage): # testing each possible starting point
        matches = total = 0
        for end in range(start, coverage): # expands forward one symbol at a time
            symbol = alignment[end]
            if symbol == '|':
                matches += 1
                total += 1
            elif symbol == '.':
                total += 1
            else:
                continue  # skip non-alignment characters

            if total == 0: # avoid division error
                continue

            identity = matches / total # computing current ratio

            # If the ratio is high enough and the region is longer than anything found before, it saves it as the best one.
            if identity >= threshold:
                curr_len = end - start + 1
                if curr_len > max_len:
                    max_len = curr_len
                    best_start, best_end = start, end

    # after parsing, returns the start and end of the longest high-quality stretch
    return best_start, best_end, max_len


alignment = "||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||.||||||||||||.......................|||."
start, end, length = compute_lca(alignment, threshold=0.98)
print(f"Best region: start={start}, end={end}, length={length}")
print("Segment:", alignment[start:end+1])
