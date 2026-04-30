// Input:  Transcode job from message queue (video_id, s3_key, renditions)
// Output: Transcoded HLS segments uploaded to S3

package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "os/exec"
    "path/filepath"

    "github.com/segmentio/kafka-go"   // v0.4.47
    "github.com/aws/aws-sdk-go-v2/service/s3" // v1.48.0
)

type TranscodeJob struct {
    VideoID    string   `json:"video_id"`
    S3Key      string   `json:"s3_key"`
    Renditions []string `json:"renditions"`
}

type Rendition struct {
    Width, Height int
    VideoBitrate  string
    AudioBitrate  string
}

var ladder = map[string]Rendition{
    "360p":  {640, 360, "800k", "96k"},
    "480p":  {854, 480, "1400k", "128k"},
    "720p":  {1280, 720, "2800k", "128k"},
    "1080p": {1920, 1080, "5000k", "192k"},
}

func transcodeRendition(inputPath, videoID, name string, r Rendition) error {
    outDir := filepath.Join("/tmp/transcode", videoID, name)
    os.MkdirAll(outDir, 0755)

    cmd := exec.Command("ffmpeg",
        "-i", inputPath,
        "-vf", fmt.Sprintf("scale=%d:%d", r.Width, r.Height),
        "-c:v", "libx264", "-preset", "medium", "-b:v", r.VideoBitrate,
        "-c:a", "aac", "-b:a", r.AudioBitrate,
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", filepath.Join(outDir, "seg_%04d.ts"),
        filepath.Join(outDir, "playlist.m3u8"),
        "-y",
    )
    return cmd.Run()
}

func worker(ctx context.Context, reader *kafka.Reader) {
    for {
        msg, err := reader.ReadMessage(ctx)
        if err != nil {
            log.Printf("read error: %v", err)
            continue
        }
        var job TranscodeJob
        json.Unmarshal(msg.Value, &job)

        log.Printf("Processing video %s with %d renditions", job.VideoID, len(job.Renditions))
        for _, name := range job.Renditions {
            r := ladder[name]
            if err := transcodeRendition("/tmp/raw/"+job.VideoID, job.VideoID, name, r); err != nil {
                log.Printf("transcode failed for %s/%s: %v", job.VideoID, name, err)
            }
        }
        // Upload segments to S3 (omitted for brevity)
    }
}
