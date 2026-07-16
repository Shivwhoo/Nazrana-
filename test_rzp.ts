import dotenv from 'dotenv';
import path from 'path';
import Razorpay from 'razorpay';

dotenv.config({ path: path.resolve(__dirname, './backend/.env') });

async function test() {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });

  console.log('KEY ID:', process.env.RAZORPAY_KEY_ID);
  console.log('KEY SECRET:', process.env.RAZORPAY_KEY_SECRET);

  try {
    const order = await razorpay.orders.create({
      amount: 10000,
      currency: 'INR',
      receipt: `receipt_test_${Date.now()}`,
    });
    console.log('Success:', order);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
