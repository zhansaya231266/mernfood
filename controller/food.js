import Food from "../models/food.js";

export const getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find(); 
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: "Ошибка сервера" });
  }
};


