// Input:  Large image file path or resource
// Output: Downsampled bitmap that fits in memory

public static Bitmap decodeSampledBitmap(String filePath,
        int reqWidth, int reqHeight) {
    // Step 1: Read dimensions only (no pixel allocation)
    final BitmapFactory.Options options = new BitmapFactory.Options();
    options.inJustDecodeBounds = true;
    BitmapFactory.decodeFile(filePath, options);

    // Step 2: Calculate inSampleSize
    options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight);

    // Step 3: Decode with inSampleSize set
    options.inJustDecodeBounds = false;
    options.inPreferredConfig = Bitmap.Config.RGB_565; // 2 bytes/pixel vs 4
    return BitmapFactory.decodeFile(filePath, options);
}

private static int calculateInSampleSize(BitmapFactory.Options options,
        int reqWidth, int reqHeight) {
    final int height = options.outHeight;
    final int width = options.outWidth;
    int inSampleSize = 1;
    if (height > reqHeight || width > reqWidth) {
        final int halfHeight = height / 2;
        final int halfWidth = width / 2;
        while ((halfHeight / inSampleSize) >= reqHeight
                && (halfWidth / inSampleSize) >= reqWidth) {
            inSampleSize *= 2;
        }
    }
    return inSampleSize;
}
