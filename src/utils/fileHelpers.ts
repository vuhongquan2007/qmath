/**
 * Safely opens a base64 encoded data URL in a new browser tab
 * by converting it to a Blob URL. This bypasses Chrome/Chromium 
 * security restrictions on opening direct "data:" URIs in new tabs.
 */
export function openBase64InNewTab(dataUrl: string, fileName: string) {
  try {
    if (!dataUrl) return;
    
    // If it's already a blob or HTTP URL, open it directly
    if (dataUrl.startsWith("blob:") || dataUrl.startsWith("http")) {
      window.open(dataUrl, "_blank");
      return;
    }

    const url = base64ToBlobUrl(dataUrl);
    
    // Create a temporary anchor and click it to open in new tab
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Error opening base64 in new tab:", error);
    // Fallback: simple window open
    window.open(dataUrl, "_blank");
  }
}

/**
 * Converts a base64 Data URL into a safe browser Blob URL.
 */
export function base64ToBlobUrl(dataUrl: string): string {
  try {
    if (!dataUrl) return "";
    if (dataUrl.startsWith("blob:") || dataUrl.startsWith("http")) {
      return dataUrl;
    }

    const parts = dataUrl.split(",");
    if (parts.length < 2) {
      return dataUrl;
    }

    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error converting base64 to blob url:", error);
    return dataUrl;
  }
}

