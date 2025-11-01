import express from "express";
import {
  getAllAdvances,
  createAdvance,
  addTransaction,
  closeAdvance,
  reopen,
  updateAdvance,
  deleteAdvance,
  getAdvanceById,
  deleteAdvance_transactions,
  update_status_Ap,
} from "../controller/Advance/provider.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, getAllAdvances);
router.post("/", authenticate, createAdvance);
router.post("/:id/transaction", authenticate, addTransaction);
router.post("/:id/close", authenticate, closeAdvance);
router.post("/:id/reopen", authenticate, reopen);
router.put("/:id", authenticate, updateAdvance);
router.delete("/:id", authenticate, deleteAdvance);
router.get("/:id", authenticate, getAdvanceById);

router.patch("/transation/:id/:item", authenticate, deleteAdvance_transactions);
router.patch("/advance/:id", authenticate, update_status_Ap);
export default router;
