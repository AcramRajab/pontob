import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

router.get("/download/pontob-mobile.tar", (_req, res) => {
  const filePath = path.resolve("downloads/pontob-mobile.tar");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", 'attachment; filename="pontob-mobile.tar"');
  res.sendFile(filePath);
});

export default router;
