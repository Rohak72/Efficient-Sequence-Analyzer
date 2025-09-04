# Efficient-Sequence-Analyzer
A wrapper for Expasy Translate and EMBOSS Needle, automating the six-frame translation and pairwise alignment feedback loop. Available as both a command-line tool and published web app!

> **NOTE:** If you're only interested in the source code, you can clone the `cli-tool` branch with `git clone -b cli-tool --single-branch https://github.com/Rohak72/Efficient-Sequence-Analyzer.git`.

Tech Stack:
- Backend: Python, FastAPI, SQLite (via SQLAlchemy ORM)
- Frontend: React, Node.js, Tailwind CSS
- Deployment: AWS Lambda, API Gateway, Vercel Hosting
- Async Processors: AWS S3 + Worker Lambda + DynamoDB

Future Plans:
- ✅ Build async processes to ingest compute-expensive alignment tasks within API Gateway's 30-sec limit.
- ⏱ Overhaul the real-time S3 database idea altogether to reduce request overload issues.
- ⏱︎ Incorporate Litestream to handle concurrent processes with write-ahead logging to a designated S3 bucket.

<hr>

<kbd>
  <img width="1440" height="776" alt="Screen Shot 2025-09-04 at 12 16 30 PM" src="https://github.com/user-attachments/assets/45e78bb6-24ae-463f-a9d0-d6713b7a78a9" />
</kbd>
