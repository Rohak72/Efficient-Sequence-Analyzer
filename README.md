# Efficient-Sequence-Analyzer
A wrapper for Expasy Translate and EMBOSS Needle, automating the six-frame translation and pairwise alignment feedback loop. Available as both a command-line tool and published web app!

> **NOTE:** If you're only interested in the source code, you can clone the `cli-tool` branch with `git clone -b cli-tool --single-branch https://github.com/Rohak72/Efficient-Sequence-Analyzer.git`.

Future Plans:
- Incorporate Litestream to handle concurrent processes with write-ahead logging to a designated S3 bucket.
- Build async processes to ingest compute-expensive alignment tasks within API Gateway's 30-sec timeout limit.

Tech Stack:
- Backend: Python, FastAPI,
- Frontend: React, Node.js, Tailwind CSS
- Deployment: AWS Lambda, API Gateway, Vercel Hosting
