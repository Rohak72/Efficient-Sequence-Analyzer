# -*- coding: utf-8 -*-
# translate.py

"""
Author: Rohak Jain
Last Date Modified: 2025-03-23
Description: 'translate' serves as the core backbone behind the frame-wise translation operation.
With a reference codon table and functionalities for translate / base-pair mapping / reverse
complement, this file is able to exhaustively parse through the forward, reverse, or combined
frames of the input sequence.

"""

# DNA Codon Chart (for dictionary-based codon-to-AA mapping)
gencode = {'ATA':'I', 'ATC':'I', 'ATT':'I', 'ATG':'M',
           'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACT':'T',
           'AAC':'N', 'AAT':'N', 'AAA':'K', 'AAG':'K',
           'AGC':'S', 'AGT':'S', 'AGA':'R', 'AGG':'R',
           'CTA':'L', 'CTC':'L', 'CTG':'L', 'CTT':'L',
           'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCT':'P',
           'CAC':'H', 'CAT':'H', 'CAA':'Q', 'CAG':'Q',
           'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGT':'R',
           'GTA':'V', 'GTC':'V', 'GTG':'V', 'GTT':'V',
           'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCT':'A',
           'GAC':'D', 'GAT':'D', 'GAA':'E', 'GAG':'E',
           'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGT':'G',
           'TCA':'S', 'TCC':'S', 'TCG':'S', 'TCT':'S',
           'TTC':'F', 'TTT':'F', 'TTA':'L', 'TTG':'L',
           'TAC':'Y', 'TAT':'Y', 'TAA':'-', 'TAG':'-',
           'TGC':'C', 'TGT':'C', 'TGA':'-', 'TGG':'W'}

conjugates = {'A':'T', 'C':'G', 'G':'C', 'T':'A'} # standard base-pair rules

def translate(sequence):
    sequence = sequence.replace("U", "T").upper() # handles mRNA to DNA conversion for compatibility
    translate = ''.join([gencode.get(sequence[3*i:3*i+3], 'X') for i in range(len(sequence) // 3)])
    return translate

def reverse_complement(sequence):
    reversed_sequence = (sequence[::-1]) # flip the sequence, then replace with complements
    rc = ''.join([conjugates.get(reversed_sequence[i], 'X') for i in range(len(sequence))])
    return rc
