app.options(/.*/, (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Authorization,Content-Type");
  return res.sendStatus(200);
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file missing" });

    const folder = req.body.folder || "uploads";
    // create key with uuid to avoid collisions
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const key = `${folder}/${Date.now()}_${uuidv4()}_${safeName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    // return key (we don't return a presigned url here)
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json({ key });
  } catch (err) {
    console.error("upload err", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message || "upload failed" });
  }
});

// Media endpoint: returns a presigned url for ?file=<key>
// If you prefer, you can also allow ?module=..&branch=.. etc and look up Firestore (not implemented here)
app.get("/media", async (req, res) => {
  try {
    const fileKey = req.query.file;
    if (!fileKey) return res.status(400).json({ error: "file missing" });

    // verify token if present (optional)
    const authHeader = (req.headers.authorization || "").replace("Bearer ", "");
    let uid = null;
    if (authHeader && auth) {
      try {
        const decoded = await auth.verifyIdToken(authHeader);
        uid = decoded.uid;
      } catch (e) {
        console.warn("invalid token", e.message);
      }
    }

    // If PUBLIC_MEDIA not true, require a token (you can relax this if your files are public)
    if (process.env.PUBLIC_MEDIA !== "true" && !uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const getCmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
    });

    const url = await getSignedUrl(s3, getCmd, { expiresIn: 300 }); // 5 minutes
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json({ url, expiresIn: 300 });
  } catch (err) {
    console.error("media err", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message || "server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Server listening on", PORT));
