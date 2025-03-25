// lib/assignIndices.ts (example)
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";

async function assignIndices() {
  await dbConnect();
  const loans = await Loan.find({ index: { $exists: false } }); // Find loans without index
  for (let i = 0; i < loans.length; i++) {
    const newIndex = i + 1; // Assign 1 to 84 sequentially
    if (newIndex <= 84) {
      await Loan.updateOne({ _id: loans[i]._id }, { $set: { index: newIndex } });
    }
  }
  console.log("Indices assigned to existing loans");
}

assignIndices().catch(console.error);