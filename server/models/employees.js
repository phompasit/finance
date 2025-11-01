import mongoose from "mongoose";

const employeesSchema = new mongoose.Schema(
  {
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
