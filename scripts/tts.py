"""Makes MP3 clips with Microsoft's Kenyan Swahili neural voices (through edge-tts).

Called by scripts/make-audio.mjs: python tts.py jobs.json out_dir
jobs.json is a list of {"key", "text", "voice"} where voice is "f" (Zuri) or "m" (Rafiki).
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICES = {"f": "sw-KE-ZuriNeural", "m": "sw-KE-RafikiNeural"}
RATE = "-8%"  # a little slower than normal speech, for learners
PARALLEL = 6


async def make(job, out_dir, sem, counter, total):
    path = os.path.join(out_dir, job["key"] + ".mp3")
    async with sem:
        for attempt in range(5):
            try:
                tmp = path + ".part"
                await edge_tts.Communicate(job["text"], VOICES[job["voice"]], rate=RATE).save(tmp)
                if os.path.getsize(tmp) == 0:
                    raise RuntimeError("empty audio")
                os.replace(tmp, path)
                counter[0] += 1
                if counter[0] % 100 == 0 or counter[0] == total:
                    print(f"  {counter[0]}/{total}", flush=True)
                return True
            except Exception as e:  # network hiccups: wait and try again
                if attempt == 4:
                    print(f"  failed: {job['text']!r}: {e}", flush=True)
                await asyncio.sleep(2 + attempt * 3)
    return False


async def main():
    jobs_path, out_dir = sys.argv[1], sys.argv[2]
    with open(jobs_path, encoding="utf-8") as f:
        jobs = json.load(f)
    sem = asyncio.Semaphore(PARALLEL)
    counter = [0]
    results = await asyncio.gather(*(make(j, out_dir, sem, counter, len(jobs)) for j in jobs))
    sys.exit(0 if all(results) else 1)


asyncio.run(main())
