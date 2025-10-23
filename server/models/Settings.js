import mongoose from "mongoose"

const settingsSchema = new mongoose.Schema(
  {
    baseCurrency: {
      type: String,
      default: "THB",
      enum: ["THB", "USD", "LAK", "EUR", "CNY"],
    },
    exchangeRates: {
      type: Map,
      of: Number,
      default: {
        THB: 1,
        USD: 35.5,
        LAK: 0.0017,
        EUR: 38.2,
        CNY: 4.9,
      },
    },
    companyInfo: {
      name: {
        type: String,
        default: "บริษัท ตัวอย่าง จำกัด",
      },
      address: {
        type: String,
        default: "123 ถนนตัวอย่าง กรุงเทพฯ 10100",
      },
      phone: {
        type: String,
        default: "02-123-4567",
      },
      email: {
        type: String,
        default: "info@example.com",
      },
      logo: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model("Settings", settingsSchema)
