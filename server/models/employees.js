import mongoose from "mongoose";

const employeesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    emp_code: {
      type: String,
    },
    full_name: {
      type: String,
    },
    department: {
      type: String,
    },
    position: {
      type: String,
    },
    phone: {
      type: String,
    },
  },
  { timestamps: true }
);

const employees = mongoose.model("Employees", employeesSchema);
export default employees;
