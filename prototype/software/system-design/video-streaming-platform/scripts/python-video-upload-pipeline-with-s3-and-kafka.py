# Input:  Raw video file path, user metadata
# Output: video_id, transcode job published to Kafka

import boto3
import json
import uuid
import hashlib
from kafka import KafkaProducer

class VideoUploadPipeline:
    def __init__(self, s3_bucket: str, kafka_brokers: list[str]):
        self.s3 = boto3.client("s3")
        self.bucket = s3_bucket
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode(),
        )

    def compute_hash(self, filepath: str) -> str:
        """Compute SHA-256 for deduplication."""
        sha = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha.update(chunk)
        return sha.hexdigest()

    def upload(self, filepath: str, user_id: str, title: str) -> dict:
        video_id = str(uuid.uuid4())
        content_hash = self.compute_hash(filepath)
        s3_key = f"raw/{video_id}/{filepath.rsplit('/', 1)[-1]}"

        # S3 multipart upload for large files
        self.s3.upload_file(
            filepath, self.bucket, s3_key,
            ExtraArgs={"Metadata": {"content-hash": content_hash}},
        )

        job = {
            "video_id": video_id,
            "s3_bucket": self.bucket,
            "s3_key": s3_key,
            "user_id": user_id,
            "title": title,
            "content_hash": content_hash,
            "renditions": ["360p", "480p", "720p", "1080p"],
        }
        self.producer.send("transcode-jobs", value=job)
        self.producer.flush()
        return job
