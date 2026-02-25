// REMOVED: Payment method storage handled by Stripe directly - 2026-02-25
// All payment method CRUD operations (GET, POST, DELETE, PATCH) have been
// commented out. Stripe manages card storage and display natively.
export {};

/*
// src/app/api/customer/payment-methods/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import User from "@/models/User";

// GET /api/customer/payment-methods - List saved payment methods
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id).select("paymentMethods");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      paymentMethods: user.paymentMethods || [],
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST /api/customer/payment-methods - Save a payment method after SetupIntent confirmation
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    // Retrieve payment method details from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!pm.card) {
      return NextResponse.json(
        { error: "Only card payment methods are supported" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate (same last4 + brand + expiry)
    const duplicate = user.paymentMethods?.find(
      (m) =>
        m.last4 === pm.card!.last4 &&
        m.brand === pm.card!.brand &&
        m.expMonth === pm.card!.exp_month &&
        m.expYear === pm.card!.exp_year
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "This card is already saved" },
        { status: 409 }
      );
    }

    // Limit to 5 saved cards
    if ((user.paymentMethods?.length || 0) >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 saved cards allowed. Please remove one first." },
        { status: 400 }
      );
    }

    const isFirst = !user.paymentMethods || user.paymentMethods.length === 0;

    const newMethod = {
      stripePaymentMethodId: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: isFirst,
      addedAt: new Date(),
    };

    await User.findByIdAndUpdate(session.user.id, {
      $push: { paymentMethods: newMethod },
    });

    return NextResponse.json({
      success: true,
      message: "Payment method saved",
      paymentMethod: newMethod,
    });
  } catch (error) {
    console.error("Error saving payment method:", error);
    return NextResponse.json(
      { error: "Failed to save payment method" },
      { status: 500 }
    );
  }
}

// DELETE /api/customer/payment-methods - Remove a saved payment method
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const methodIndex = user.paymentMethods?.findIndex(
      (m) => m.stripePaymentMethodId === paymentMethodId
    );

    if (methodIndex === undefined || methodIndex === -1) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    const wasDefault = user.paymentMethods[methodIndex].isDefault;

    // Detach from Stripe customer
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.warn("Failed to detach payment method from Stripe:", error);
    }

    // Remove from user record
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { paymentMethods: { stripePaymentMethodId: paymentMethodId } },
    });

    // If the removed card was default, set the next one as default
    if (wasDefault) {
      const updatedUser = await User.findById(session.user.id);
      if (updatedUser?.paymentMethods?.length) {
        updatedUser.paymentMethods[0].isDefault = true;
        await updatedUser.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment method removed",
    });
  } catch (error) {
    console.error("Error removing payment method:", error);
    return NextResponse.json(
      { error: "Failed to remove payment method" },
      { status: 500 }
    );
  }
}

// PATCH /api/customer/payment-methods - Set a card as default
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const methodExists = user.paymentMethods?.some(
      (m) => m.stripePaymentMethodId === paymentMethodId
    );

    if (!methodExists) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Unset all defaults, then set the target one
    user.paymentMethods.forEach((m) => {
      m.isDefault = m.stripePaymentMethodId === paymentMethodId;
    });

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Default payment method updated",
    });
  } catch (error) {
    console.error("Error updating default payment method:", error);
    return NextResponse.json(
      { error: "Failed to update default payment method" },
      { status: 500 }
    );
  }
}
*/
