import mongoose from "mongoose";

const FoodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  variants: [{ type: String }],
  prices: { type: Object, required: true }, 
  category: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
});

FoodSchema.index({ category: 1 });

const Food = mongoose.model("Food", FoodSchema);
export default Food;
