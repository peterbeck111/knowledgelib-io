// Input:  Runtime permission request before camera access
// Output: Graceful handling without SecurityException crash

private static final int REQUEST_CAMERA = 100;

private void openCamera() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
        launchCamera();
    } else if (shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)) {
        showPermissionRationale();  // Explain why you need it
    } else {
        requestPermissions(
            new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
    }
}

@Override
public void onRequestPermissionsResult(int requestCode,
        @NonNull String[] permissions, @NonNull int[] grantResults) {
    if (requestCode == REQUEST_CAMERA
            && grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        launchCamera();
    } else {
        showPermissionDeniedMessage();  // Never crash — degrade gracefully
    }
}
