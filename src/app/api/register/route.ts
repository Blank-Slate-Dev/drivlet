// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { validatePassword, validateEmail, validateUsername } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { username, email, mobile, password } = await request.json();

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate Australian mobile number if provided
    if (mobile && !/^04\d{8}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Please enter a valid Australian mobile number (04XX XXX XXX)" },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Connect to database
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connection established');

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user with explicit role
    console.log('Creating user with data:', {
      username: username.trim(),
      email: email.toLowerCase(),
      mobile: mobile || undefined,
      role: 'user'
    });

    const user = new User({
      username: username.trim(),
      email: email.toLowerCase(),
      ...(mobile && { mobile }),
      password: hashedPassword,
      role: 'user', // Explicitly set role
      emailVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    console.log('User object created, attempting to save...');
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    // Send verification email
    try {
      await sendVerificationEmail(
        email.toLowerCase(),
        username.trim(),
        verificationCode
      );
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can resend
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully. Please check your email to verify your account.",
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Detailed registration error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
