// // backend/server.js
// require("dotenv").config();
// const express = require("express");
// const multer = require("multer");
// const cors = require("cors");
// const {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
// } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
// const admin = require("firebase-admin");
// const { v4: uuidv4 } = require("uuid");

// const upload = multer({ storage: multer.memoryStorage() });
// const app = express();
// app.use(cors());
// app.use(express.json());

// // Initialize Firebase Admin
// let serviceAccount;
// if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
//   serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// } else {
//   // if you prefer file
//   // admin.initializeApp({ credential: admin.credential.cert(require("./firebase-key.json"))});
//   console.error("FIREBASE_SERVICE_ACCOUNT_JSON missing!");
//   process.exit(1);
// }
// const db = admin.firestore();
// const auth = admin.auth();

// // S3 / R2 client
// const s3 = new S3Client({
//   region: process.env.R2_REGION || "auto",
//   endpoint: process.env.R2_ENDPOINT, // e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
//   credentials: {
//     accessKeyId: process.env.R2_ACCESS_KEY,
//     secretAccessKey: process.env.R2_SECRET_KEY,
//   },
//   forcePathStyle: false,
// });

// // Helper: basic permission check (customize later)
// async function userHasAccessToVideo(uid, moduleId) {
//   if (!uid) return false;
//   const userDoc = await db.collection("users").doc(uid).get();
//   if (!userDoc.exists) return false;
//   const u = userDoc.data();
//   if (u.isSubscribed) return true;
//   if (u.moduleAccess && u.moduleAccess[moduleId]) return true;
//   return false;
// }

// // Upload endpoint (multipart form-data): returns { key }
// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "file missing" });
//     const folder = req.body.folder || "uploads";
//     // optional: check admin token in header if you want to restrict upload
//     // const token = (req.headers.authorization || "").replace("Bearer ", "");
//     // verify token if needed...
//     const key = `${folder}/${Date.now()}_${uuidv4()}_${req.file.originalname.replace(
//       /\s+/g,
//       "_"
//     )}`;
//     await s3.send(
//       new PutObjectCommand({
//         Bucket: process.env.R2_BUCKET,
//         Key: key,
//         Body: req.file.buffer,
//         ContentType: req.file.mimetype,
//         // you can add ACL or metadata here
//       })
//     );
//     return res.json({ key });
//   } catch (err) {
//     console.error("upload err", err);
//     return res.status(500).json({ error: err.message || "upload failed" });
//   }
// });

// // Get presigned URL for a file (file=key) OR by module/subbranch/video id
// // query: ?file=<key>  OR ?module=..&branch=..&subbranch=..&videoId=..
// app.get("/media", async (req, res) => {
//   try {
//     const fileKey = req.query.file;
//     const moduleId = req.query.module;
//     const branchId = req.query.branch;
//     const subbranchId = req.query.subbranch;
//     const videoId = req.query.videoId;

//     // get token if provided
//     const authHeader = (req.headers.authorization || "").replace("Bearer ", "");
//     let uid = null;
//     if (authHeader) {
//       try {
//         const decoded = await auth.verifyIdToken(authHeader);
//         uid = decoded.uid;
//       } catch (e) {
//         console.warn("invalid token", e.message);
//       }
//     }

//     let keyToServe = null;
//     let isFree = false;
//     if (fileKey) {
//       keyToServe = fileKey;
//       // Without mapping to firestore we can't know free/paid status.
//       // To be strict: require token if not free — but we don't know.
//       // We will allow if token exists, otherwise block (you can relax).
//       if (!uid) {
//         return res.status(401).json({ error: "Unauthenticated" });
//       }
//     } else if (moduleId && branchId && subbranchId && videoId) {
//       const videoRef = db
//         .collection("modules")
//         .doc(moduleId)
//         .collection("branches")
//         .doc(branchId)
//         .collection("subbranches")
//         .doc(subbranchId)
//         .collection("videos")
//         .doc(videoId);

//       const vSnap = await videoRef.get();
//       if (!vSnap.exists)
//         return res.status(404).json({ error: "video not found" });
//       const v = vSnap.data();
//       keyToServe = v.src;
//       isFree = !!v.isFree;
//       // allow if free
//       if (!isFree) {
//         if (!uid)
//           return res.status(401).json({ error: "Authentication required" });
//         const allowed = await userHasAccessToVideo(uid, moduleId);
//         if (!allowed) {
//           // you can also check a per-user allow list
//           const userDoc = await db.collection("users").doc(uid).get();
//           const ud = userDoc.exists ? userDoc.data() : {};
//           if (!(ud.allowedVideos && ud.allowedVideos.includes(keyToServe))) {
//             return res.status(403).json({ error: "Forbidden" });
//           }
//         }
//       }
//     } else {
//       return res.status(400).json({ error: "Bad request" });
//     }

//     if (!keyToServe) return res.status(404).json({ error: "no file key" });

//     // create presigned url (expires in seconds)
//     const getCmd = new GetObjectCommand({
//       Bucket: process.env.R2_BUCKET,
//       Key: keyToServe,
//     });

//     const url = await getSignedUrl(s3, getCmd, { expiresIn: 300 }); // 5 minutes
//     return res.json({ url, expiresIn: 300 });
//   } catch (err) {
//     console.error("media err", err);
//     return res.status(500).json({ error: err.message || "server error" });
//   }
// });

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log("Server listening on", PORT));
/////////////////////////////////كود جديد ////////////////////////////
// module.exports = {
//   async fetch(request, env, ctx) {
//     const url = new URL(request.url);

//     if (request.method === "OPTIONS") {
//       return new Response(body, {
//         headers: {
//           "Content-Type": "video/mp4",
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//           "Access-Control-Allow-Headers": "*",
//         },
//       });
//     }

//     try {
//       // 👇 هنا المنطق اللي عندك (جلب الفيديو/الصورة من R2)
//       const object = await env.MY_BUCKET.get("example.mp4"); // مثال
//       if (!object) return new Response("Not found", { status: 404 });

//       return new Response(object.body, {
//         headers: {
//           "Content-Type": "video/mp4",
//           "Access-Control-Allow-Origin": "*",
//         },
//       });
//     } catch (err) {
//       return new Response("Server error: " + err.message, { status: 500 });
//     }
//   },
// };
////////////////////////////////////////////////////////////////////////
// server.cjs
require("dotenv").config();
console.log("PUBLIC_MEDIA at startup =", process.env.PUBLIC_MEDIA);
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin (optional, used to verify id tokens)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("Firebase admin initialized");
  } catch (e) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON", e);
  }
} else {
  console.warn(
    "FIREBASE_SERVICE_ACCOUNT_JSON not provided — token verification disabled"
  );
}

const db = admin.firestore ? admin.firestore() : null;
const auth = admin.auth ? admin.auth() : null;

// S3 / R2 client
const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT, // e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: false,
});

// Helpers
async function verifyTokenIfPresent(req) {
  const authHeader = (req.headers.authorization || "").replace("Bearer ", "");
  if (!authHeader || !auth) return null;
  try {
    const decoded = await auth.verifyIdToken(authHeader);
    return decoded.uid;
  } catch (e) {
    console.warn("invalid token", e.message);
    return null;
  }
}

// CORS preflight handled by cors middleware, but add explicit options to be safe:
// app.options("/*", (req, res) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Authorization,Content-Type");
//   return res.sendStatus(200);
// });
// هذا يلتقط أي OPTIONS لأي مسار

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
