# -*- coding: utf-8 -*-
# utils.py

"""
Author: Rohak Jain
Last Date Modified: 2025-03-27
Description: 'utils' is responsible for verifying the user input in the ESA pipeline, distilling
down the information in the input FASTA into a series of sequence records, and relaying the results
generated to an external dataframe. Functions as a helper script for main.  

"""

from Bio import SeqIO
import pandas as pd

def process_fasta(filename):
    try:
        return SeqIO.to_dict(SeqIO.parse(filename, "fasta"))
    except FileNotFoundError: # re-initiating the FASTA input if no file was found
        print("File not found; please check your path/spelling and try again!")
        get_input("Enter the filepath/filename of your FASTA: ", ".fasta", "ending")

def get_input(prompt, valid_set, mode = "options"):
    while True:
        value = input(prompt).strip() # removing extraneous whitespace from the input string
        
        if mode == "options" and value.upper() not in valid_set:
            print(f"Sorry, your response must be one of the following: {', '.join(valid_set)}")
            continue
        elif mode == "substr" and not all(x.isalpha() for x in value):
            print(f"Sorry, your response must only be comprised of {valid_set}")
            continue
        elif mode == "ending" and not value.endswith(valid_set):
            print(f"Sorry, your response must end with {valid_set}")
            continue
        else:
            break

    return value

def data_export(df, seq_name, direction, vector_info, likely_seq, metadata, align_perf):
    new_row = {"Name": seq_name, 
               "Direction": direction, 
               "Vector?": vector_info, 
               "Most-Likely-Seq": likely_seq, 
               "Seq-Metadata": metadata,
               "Alignment-Identity (%)": align_perf}
    
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index = True) # appending new row
    return df