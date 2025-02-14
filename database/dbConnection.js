import mongoose from "mongoose";

export const dbConnection = () => {
  mongoose
    .connect("mongodb+srv://cterekbaev:EE5jfr78QbkaFWnA@cluster0.164ht.mongodb.net/?retryWrites=true", {
      dbName: "mern-food",
    })
    .then(() => {
      console.log("Connected to database!");
    })
    .catch((err) => {
      console.log(`Some error occured while connecing to database: ${err}`);
    });
};
