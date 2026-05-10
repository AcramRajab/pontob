import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.session.userRole || "")) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const role = req.session.userRole || "";
  if (role !== "master_admin" && role !== "staff_regional") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  next();
}

// Blocks responsavel_interno from write operations — they are read-only
export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.userRole === "responsavel_interno") {
    res.status(403).json({ error: "Somente leitura. Seu perfil não permite criar ou editar dados." });
    return;
  }
  next();
}
