// src/lib/seedTestimonials.ts
import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";

const testTestimonials = [
  {
    customerName: "Sarah Mitchell",
    customerLocation: "Merewether, NSW",
    rating: 5,
    review:
      "Absolute lifesaver! I didn't have to take time off work to get my car serviced. The driver picked it up from my driveway and had it back by the afternoon. Couldn't be easier.",
    vehicleType: "Toyota Corolla",
    serviceType: "Annual Service",
  },
  {
    customerName: "James Thornton",
    customerLocation: "Charlestown, NSW",
    rating: 5,
    review:
      "Brilliant concept. I was dreading organising a lift to drop my car at the mechanic. Drivlet handled everything — pickup, drop-off, and return. Professional service from start to finish.",
    vehicleType: "Mazda CX-5",
    serviceType: "Brake Replacement",
  },
  {
    customerName: "Emily Nguyen",
    customerLocation: "Hamilton, NSW",
    rating: 4,
    review:
      "So convenient! I booked online in minutes and the driver was right on time. My car was back before I even finished work. Will definitely use again.",
    vehicleType: "Hyundai i30",
    serviceType: "Tyre Rotation",
  },
  {
    customerName: "David Clarke",
    customerLocation: "Lambton, NSW",
    rating: 5,
    review:
      "As someone who works from home, I still found it a hassle to drop my car off. Drivlet removed that hassle completely. The flat fee is well worth it for the convenience.",
    vehicleType: "Ford Ranger",
    serviceType: "Logbook Service",
  },
  {
    customerName: "Rachel Adams",
    customerLocation: "Adamstown, NSW",
    rating: 5,
    review:
      "Used Drivlet for the first time last week and I'm hooked. The tracking updates were great — I knew exactly where my car was the whole time. Highly recommend.",
    vehicleType: "Kia Sportage",
    serviceType: "General Repair",
  },
  {
    customerName: "Mark O'Brien",
    customerLocation: "Jesmond, NSW",
    rating: 4,
    review:
      "Really impressed with how smooth the whole process was. Booked it, car got picked up, serviced, and returned. No dramas at all. Great for busy families.",
    vehicleType: "Volkswagen Golf",
    serviceType: "Air Con Regas",
  },
  {
    customerName: "Lisa Patel",
    customerLocation: "Mayfield, NSW",
    rating: 5,
    review:
      "I recommended Drivlet to all my mates. It's one of those services you didn't know you needed until you try it. Saves so much time and stress.",
    vehicleType: "Subaru Forester",
    serviceType: "Annual Service",
  },
  {
    customerName: "Tom Henderson",
    customerLocation: "Wallsend, NSW",
    rating: 5,
    review:
      "Top-notch service. The driver was friendly and professional. My car was returned clean and serviced exactly as promised. Five stars from me.",
    vehicleType: "Holden Colorado",
    serviceType: "Major Service",
  },
];

export async function seedTestimonials(): Promise<number> {
  await connectDB();

  const count = await Testimonial.countDocuments();
  if (count > 0) {
    return 0;
  }

  const docs = testTestimonials.map((t) => ({
    ...t,
    isApproved: true,
    isDisplayed: true,
    source: "admin_created" as const,
    submittedAt: new Date(),
    approvedAt: new Date(),
  }));

  await Testimonial.insertMany(docs);
  return docs.length;
}
