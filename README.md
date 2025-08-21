# Efficient-Sequence-Analyzer
A wrapper for Expasy Translate and EMBOSS Needle, automating the six-frame translation and pairwise alignment feedback loop. Available as both a command-line tool and published web app!

Future Plans:
- Incorporate Litestream to handle concurrent processes with continuous write-ahead logging to a designated S3 bucket.
- Build an async process to ingest compute-expensive alignment tasks within API Gateway's 30-sec timeout limit.
