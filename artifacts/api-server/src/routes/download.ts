import { Router, type IRouter } from "express";
import fs from "fs";

const router: IRouter = Router();

const TAR_PATH = "/home/runner/workspace/artifacts/api-server/downloads/pontob-mobile.tar";

router.get("/download/pontob-mobile.tar", (_req, res) => {
  if (!fs.existsSync(TAR_PATH)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", 'attachment; filename="pontob-mobile.tar"');
  res.sendFile(TAR_PATH);
});

export default router;
