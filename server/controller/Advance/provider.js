import AdvanceRequests from "../../models/advanceRequests.js";
import AdvanceClosure from "../../models/advanceClosure.js";
import IncomeExpense from "../../models/IncomeExpense.js";
import mongoose from "mongoose";

// ✅ ดึงรายการเบิกทั้งหมด
export const getAllAdvances = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const advances = await AdvanceRequests.find(query)
      .populate("employee_id", "full_name department position")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: advances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ สร้างใบเบิกล่วงหน้าใหม่ (รองรับหลายสกุลเงิน)
export const createAdvance = async (req, res) => {
  try {
    // Validate amounts array

    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const expenses = await IncomeExpense.find();
    const advances = await AdvanceRequests.find();
    const allSerials = [
      ...expenses.map((e) => e.serial),
      ...advances.map((a) => a.serial),
    ];
    const isDuplicate = allSerials.includes(req.body.serial);

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "❌ ເລກທີນີ້ມີຢູ່ໃນລະບົບແລ້ວ (ອາດຢູ່ຝັ່ງລາຍຈ່າຍຫຼືລາຍຈ່າຍລ່ວງໜ້າ)",
      });
    }
    if (
      !req.body.amounts ||
      !Array.isArray(req.body.amounts) ||
      req.body.amounts.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "amounts must be a non-empty array",
      });
    }

    // Validate each amount entry
    const validatedAmounts = req.body.amounts.map((item) => {
      if (!item.currency || !item.amount) {
        throw new Error("Each amount must have currency and amount");
      }
      return {
        currency: item.currency,
        amount: parseFloat(item.amount),
      };
    });

    const newAdvance = await AdvanceRequests.create({
      userId: query.userId,
      type: req.body.type || "employee",
      status_payment: req.body.status_payment,
      status_Ap: "pending",
      employee_id: req.body.employee_id || null,
      purpose: req.body.purpose,
      serial: req.body.serial,
      amount_requested: validatedAmounts,
      request_date: req.body.request_date || new Date(),
      paymentMethods: req.body.paymentMethods,
      meta: {
        company: req.body.meta?.company,
        date_from: req.body.meta?.date_from,
        date_to: req.body.meta?.date_to,
        requester: req.body.meta?.requester,
        note: req.body.meta?.note,
      },
    });

    await newAdvance.populate("employee_id", "full_name department position");

    res.status(201).json({ success: true, data: newAdvance });
  } catch (err) {
    console.error("Create advance error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ แก้ไขรายการเบิก (รองรับหลายสกุลเงิน)
export const updateAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await AdvanceRequests.findById(id);
    if (!advance) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບຂໍ້ມູນ." });
    }

    // ดึงข้อมูลจากทั้งสอง collection
    const expenses = await IncomeExpense.find();
    const advances = await AdvanceRequests.find();

    // รวมทั้งหมด
    const allDocs = [
      ...expenses.map((e) => ({ id: e._id.toString(), serial: e.serial })),
      ...advances.map((a) => ({ id: a._id.toString(), serial: a.serial })),
    ];

    // ตรวจว่ามี serial ซ้ำ และไม่ใช่ของตัวเอง
    const isDuplicate = allDocs.some(
      (d) => d.serial === req.body.serial && d.id !== id
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "❌ ເລກທີນີ້ມີຢູ່ໃນລະບົບແລ້ວ (ອາດຢູ່ຝັ່ງລາຍຈ່າຍຫຼືລາຍຈ່າຍລ່ວງໜ້າ)",
      });
    }
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }
    // Update amounts if provided
    if (req.body.amounts && Array.isArray(req.body.amounts)) {
      // 1️⃣ แปลงค่าที่รับมาให้สะอาดก่อน
      const validatedAmounts = req.body.amounts.map((item) => ({
        currency: item.currency,
        amount: parseFloat(item.amount),
      }));

      // 2️⃣ ตรวจว่าใน request เองมีสกุลเงินซ้ำไหม
      const currencies = validatedAmounts.map((a) => a.currency);
      const hasDuplicateInRequest =
        new Set(currencies).size !== currencies.length;

      if (hasDuplicateInRequest) {
        return res.status(400).json({
          success: false,
          message: "ສະກຸນເງິນຊ້ຳໃນຄໍາຂໍຂອງທ່ານ",
        });
      }

      advance.amount_requested = validatedAmounts;
    }
    // Update other fields
    console.log("req.body.employee_id",req.body)
    if (req.body.purpose) advance.purpose = req.body.purpose;
    if (req.body.request_date) advance.request_date = req.body.request_date;
    if (req.body.serial) advance.serial = req.body.serial;
    if (req.body.serial) advance.serial = req.body.serial;
    if (req.body.status_payment)
      advance.status_payment = req.body.status_payment;
    if (req.body.status_Ap) advance.status_Ap = req.body.status_Ap;
    if (req.body.employee_id) advance.employee_id = req.body.employee_id;
    await advance.save();
    await advance.populate("employee_id", "full_name department position");

    res.json({ success: true, data: advance });
  } catch (err) {
    console.error("Update advance error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ เพิ่มรายการ transaction (รองรับหลายสกุลเงิน)
export const addTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, currency, note } = req.body;
    const advance = await AdvanceRequests.findById(id);
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }
    // Validate transaction data
    if (!type || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາລະບຸປະເພດ ຈຳນວນເງິນ ",
      });
    }
    const existing = advance.transactions.filter(
      (i) => i.currency === currency
    );

    // ---- ตรวจซ้ำ ----
    const typeExists = existing.some((tx) => tx.type === type);
    if (typeExists) {
      return res.status(400).json({
        message: `ບໍ່ອະນຸຍາດເພີ່ມ "${type}" ມີຢູ່ແລ້ວໃນ ${currency}`,
      });
    }

    // ---- ตรวจความสัมพันธ์ระหว่าง return_to_company และ refund_to_employee ----
    const hasReturn = existing.some((tx) => tx.type === "return_to_company");
    const hasRefund = existing.some((tx) => tx.type === "refund_to_employee");

    if (type === "refund_to_employee" && hasReturn) {
      return res.status(400).json({
        message: `ບໍ່ສາມາດເພີ່ມ "ຄືນພະນັກງານ" ໄດ້ ເພາະມີ  "ຄືນບໍລິສັດ" ແລວໃນ ${currency}`,
      });
    }

    if (type === "return_to_company" && hasRefund) {
      return res.status(400).json({
        message: `ບໍ່ສາມາດເພີ່ມ "ຄືນບໍລິສັດ" ໄດ້ ເພາະມີ "ຄືນພະນັກງານ" ແລ້ວໃນ ${currency}`,
      });
    }
    // Add transaction
    advance.transactions.push({
      type,
      amount: parseFloat(amount),
      currency,
      date: new Date(),
      note: note || "",
    });

    // อัปเดต summary ตามสกุลเงิน
    const summaryMap = new Map();

    advance.transactions.forEach((t) => {
      if (!summaryMap.has(t.currency)) {
        summaryMap.set(t.currency, {
          total_spent: 0,
          total_return_to_company: 0,
          total_refund_to_employee: 0,
          total_additional_request: 0,
        });
      }

      const currencySummary = summaryMap.get(t.currency);

      switch (t.type) {
        case "spend":
          currencySummary.total_spent += t.amount;
          break;
        case "return_to_company":
          currencySummary.total_return_to_company += t.amount;
          break;
        case "refund_to_employee":
          currencySummary.total_refund_to_employee += t.amount;
          break;
        case "additional_request":
          currencySummary.total_additional_request += t.amount;
          break;
      }
    });

    // Convert Map to plain object for MongoDB
    const summaryObject = {};
    summaryMap.forEach((value, key) => {
      summaryObject[key] = value;
    });

    advance.summary = summaryObject;
    await advance.save();
    await advance.populate("employee_id", "full_name department position");

    res.json({ success: true, data: advance });
  } catch (err) {
    console.error("Add transaction error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ ปิดใบเบิก (ย้ายเข้ารายจ่าย) - รองรับหลายสกุลเงิน
export const closeAdvance = async (req, res) => {
  try {
    const { id } = req.params;

    // 🧩 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advance ID format",
      });
    }

    // 🧩 2. Find advance and populate needed fields
    const advance = await AdvanceRequests.findById(id)
      .populate("employee_id", "full_name")
      .lean(); // ✅ ใช้ lean() เพื่อลด Map issue

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "ລາຍການເບີກບໍ່ພົບ",
      });
    }

    // 🧩 3. Already closed
    if (advance.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "ລາຍການຖືກປິດແລ້ວ",
      });
    }
    if (advance.status_Ap !== "approve") {
      return res.status(400).json({
        success: false,
        message: "ຕ້ອງໄດ້ຮັບອະນຸມັດ ເຖິງສາມາດປິດຍອດເບີກໄດ້",
      });
    }
    // 🧩 4. Validate transactions exist
    if (
      !Array.isArray(advance.transactions) ||
      advance.transactions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "❌ ຍັງບໍ່ມີການບັນທຶກການເຄື່ອນໄຫວ",
      });
    }

    // 🧩 5. Validate summary
    if (!advance.summary || Object.keys(advance.summary).length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ ບໍ່ສາມາດປິດໄດ້ ເນື່ອງຈາກຍັງບໍ່ມີຂໍ້ມູນສະຫຼຸບ",
      });
    }

    // 🧩 6. Handle Map => Object conversion (รองรับทั้ง Map และ plain object)
    let summaryObj = advance.summary;
    if (summaryObj instanceof Map) {
      summaryObj = Object.fromEntries(summaryObj);
    }

    // 🧩 7. Check has spent > 0
    const hasSpent = Object.values(summaryObj).some(
      (s) => Number(s?.total_spent || 0) > 0
    );
    if (!hasSpent) {
      return res.status(400).json({
        success: false,
        message: "❌ ບໍ່ມີການໃຊ້ຈ່າຍຈິງ ຈຶ່ງປິດບໍ່ໄດ້",
      });
    }

    // 🧩 8. Prepare calculated summary & net
    const summaryDetails = {};
    const remainingAmounts = [];

    for (const [currency, s] of Object.entries(summaryObj)) {
      const total_spent = Number(s?.total_spent || 0);
      const total_refund_to_employee = Number(s?.total_refund_to_employee || 0);
      const total_return_to_company = Number(s?.total_return_to_company || 0);

      const requested = advance.amount_requested?.find(
        (a) => a.currency === currency
      );
      const amount_requested = Number(requested?.amount || 0);

      // ✅ Net = spent + refund - return - requested
      const net_amount = total_spent + total_refund_to_employee;

      summaryDetails[currency] = {
        total_spent,
        total_refund_to_employee,
        total_return_to_company,
        amount_requested,
        net_amount,
      };

      if (net_amount !== 0) {
        remainingAmounts.push({
          currency,
          amount: Math.abs(net_amount),
          type: net_amount > 0 ? "additional_expense" : "return",
        });
      }
    }

    // 🧩 9. Determine user id for IncomeExpense linkage
    const targetUserId =
      req.user.role === "admin" ? req.user._id : req.user.companyId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot determine user target ID",
      });
    }

    // 🧩 10. Create AdvanceClosure
    const closureData = {
      advance_id: advance._id,
      employee_id: advance.employee_id?._id,
      summary: summaryDetails,
      remarks: req.body.remarks || "",
      created_by: req.user?._id,
      closed_at: new Date(),
    };

    const closure = await AdvanceClosure.create(closureData);

    // 🧩 11. Update AdvanceRequest status
    await AdvanceRequests.findByIdAndUpdate(advance._id, {
      status: "closed",
      closed_at: new Date(),
      updated_by: req.user?._id,
    });

    // 🧩 12. Create Income/Expense if needed
    if (remainingAmounts.length > 0) {
      await IncomeExpense.create({
        userId: targetUserId,
        serial: advance.serial,
        description: `ປິດຍອດເບີກ: ${advance.purpose}`,
        type: "expense",
        paymentMethod: advance.paymentMethods,
        date: new Date(),
        amounts: remainingAmounts,
        note: `${advance.meta?.note || ""} | Employee: ${
          advance.employee_id?.full_name || "Unknown"
        }`,
        createdBy: req.user?._id,
        status: advance.status_payment || "unpaid",
        status_Ap: advance.status_Ap || "pending",
        advance: "advance",
        referance: id,
      });
    }

    // 🧩 13. Return success
    return res.json({
      success: true,
      message: "✅ ປິດຍອດເບີກສຳເລັດແລ້ວ",
      data: {
        closure,
        summary: summaryDetails,
        net_amounts: remainingAmounts,
      },
    });
  } catch (err) {
    console.error("❌ Close advance error:", err);

    // 🧩 Prevent Mongoose Map cast error from killing API
    if (err.message.includes("Cast to Map failed")) {
      return res.status(400).json({
        success: false,
        message:
          "⚠️ Invalid summary format — please ensure it’s a plain object before saving",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};
// ✅ เปิดใบเบิกอีกครั้ง
export const reopen = async (req, res) => {
  try {
    const advance = await AdvanceRequests.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }

    if (advance.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "Advance is not closed",
      });
    }

    // ลบเอกสารปิดยอด
    await AdvanceClosure.findOneAndDelete({
      advance_id: req.params.id,
    });

    // อัปเดตสถานะ
    advance.status = "open";
    advance.closed_at = null;
    advance.updated_by = req.user?._id;

    await advance.save();
    await advance.populate("employee_id", "full_name employee_code email");
    await IncomeExpense.findOneAndDelete({
      referance: req.params.id,
    });
    res.json({
      success: true,
      message: "Advance reopened successfully",
      data: advance,
    });
  } catch (err) {
    console.error("Reopen advance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ ลบรายการเบิก
export const deleteAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await AdvanceRequests.findById(id);

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }

    if (advance.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete closed advance",
      });
    }

    await AdvanceRequests.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Advance deleted successfully",
    });
  } catch (err) {
    console.error("Delete advance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ ดูรายละเอียดเบิกล่วงหน้า
export const getAdvanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await AdvanceRequests.findById(id)
      .populate("employee_id", "full_name department position email")
      .lean();

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }

    res.json({ success: true, data: advance });
  } catch (err) {
    console.error("Get advance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// 🧮 ฟังก์ชันคำนวณ summary ใหม่ทั้งหมดจาก transactions
function recalcSummary(transactions) {
  const summary = {};

  for (const tx of transactions) {
    const cur = tx.currency;

    if (!summary[cur]) {
      summary[cur] = {
        total_spent: 0,
        total_return_to_company: 0,
        total_refund_to_employee: 0,
        total_additional_request: 0,
      };
    }

    switch (tx.type) {
      case "spend":
        summary[cur].total_spent += Number(tx.amount || 0);
        break;
      case "return_to_company":
        summary[cur].total_return_to_company += Number(tx.amount || 0);
        break;
      case "refund_to_employee":
        summary[cur].total_refund_to_employee += Number(tx.amount || 0);
        break;
      case "additional_request":
        summary[cur].total_additional_request += Number(tx.amount || 0);
        break;
      default:
        break;
    }
  }

  return summary;
}
// 🧩 ลบ transaction และอัปเดต summary
export const deleteAdvance_transactions = async (req, res) => {
  try {
    const { id, item } = req.params; // id = advance._id, item = transaction._id

    const advance = await AdvanceRequests.findById(id);
    if (!advance) {
      return res
        .status(404)
        .json({ success: false, message: "Advance not found" });
    }

    // ตรวจสอบว่ามี transaction นี้ไหม
    const exists = advance.transactions.some(
      (tx) => tx._id.toString() === item
    );
    if (!exists) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // ลบออก
    advance.transactions = advance.transactions.filter(
      (tx) => tx._id.toString() !== item
    );

    // ✅ คำนวณ summary ใหม่
    advance.summary = recalcSummary(advance.transactions);

    await advance.save();

    res.json({
      success: true,
      message: "Transaction deleted and summary updated successfully",
      transactions: advance.transactions,
      summary: advance.summary,
    });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const update_status_Ap = async (req, res) => {
  try {
    const id = req.params.id.replace(/^:/, "");
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const record = await AdvanceRequests.findOneAndUpdate(
      { _id: id, ...query },
      req.body,
      {
        new: true,
      }
    );
    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json(record);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
};
