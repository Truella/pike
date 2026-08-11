import fs from "node:fs";
import path from "node:path";

const LINKEDIN_API_BASE = "https://api.linkedin.com";

/**
 * Uploads an image to LinkedIn via the three-step Images API flow.
 *
 * Step 1: Register the upload (POST /rest/images?action=initializeUpload)
 * Step 2: PUT the binary to the returned upload URL
 * Step 3: Return the image URN from the registration response
 *
 * @param {string} imagePathOrBuffer - Absolute path to an image file, or a Buffer.
 * @param {string} linkedinAccessToken - OAuth 2.0 access token with w_member_social scope.
 * @param {string} linkedinPersonUrn - The authenticated member's URN (urn:li:person:<id>).
 * @param {string} linkedinApiVersion - LinkedIn-Version header value in YYYYMM format (e.g. "202607").
 *   LinkedIn versions sunset on a rolling ~12-month basis; update the LINKEDIN_API_VERSION secret
 *   rather than editing this file when a new version is required.
 * @returns {Promise<string>} The image URN to reference in a post payload.
 */
export async function uploadImageToLinkedIn(imagePathOrBuffer, linkedinAccessToken, linkedinPersonUrn, linkedinApiVersion) {
  // Resolve image buffer
  let imageBuffer;
  if (typeof imagePathOrBuffer === "string") {
    const resolvedPath = path.resolve(imagePathOrBuffer);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image upload failed: file not found at path "${resolvedPath}"`);
    }
    imageBuffer = fs.readFileSync(resolvedPath);
  } else if (Buffer.isBuffer(imagePathOrBuffer)) {
    imageBuffer = imagePathOrBuffer;
  } else {
    throw new Error("Image upload failed: imagePathOrBuffer must be a file path string or a Buffer");
  }

  if (imageBuffer.length === 0) {
    throw new Error("Image upload failed: provided image is empty (0 bytes)");
  }

  // Step 1: Initialize upload
  const initRes = await fetch(
    `${LINKEDIN_API_BASE}/rest/images?action=initializeUpload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${linkedinAccessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": linkedinApiVersion, // YYYYMM — update LINKEDIN_API_VERSION secret annually
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: linkedinPersonUrn,
        },
      }),
    }
  );

  if (!initRes.ok) {
    throw new Error(
      `Image upload step 1 (initializeUpload) failed (${initRes.status}): ${await initRes.text()}`
    );
  }

  const initData = await initRes.json();
  const uploadUrl = initData?.value?.uploadUrl;
  const imageUrn = initData?.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error(
      `Image upload step 1 returned an unexpected response shape: ${JSON.stringify(initData)}`
    );
  }

  // Step 2: PUT the binary to the upload URL
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${linkedinAccessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!putRes.ok) {
    throw new Error(
      `Image upload step 2 (binary PUT) failed (${putRes.status}): ${await putRes.text()}`
    );
  }

  // Step 3: Return the URN
  return imageUrn;
}
