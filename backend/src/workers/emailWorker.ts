import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

interface AlertTriggeredEvent {
  alertId: string;
  userId: string;
  email: string;
  symbol: string;
  price: number;
  target: number;
  triggeredAt: number;
  name:string
}

const resend = new Resend(process.env.RESEND_API_KEY!);

const run = async (data: AlertTriggeredEvent) => {
  try {
    const response = await resend.emails.send({
      from: "onboarding@resend.dev", // sandbox sender
      to: data.email,
      subject: "Price Alert 🚀",
      html: `
        <h2>Price Alert Triggered </h2>
         <p> Message: ${data.name}</p>
        <p><b>${data.symbol}</b> hit <b>${data.price}</b></p>
        <p>Target: ${data.target}</p>
      `,
      text: `${data.symbol} hit ${data.price} (target: ${data.target})`,
    });

    console.log("Email sent:", data.email, response);
  } catch (err) {
    console.error("Email failed:", err);
    throw err; // important for Kafka retry
  }
};

export default run;