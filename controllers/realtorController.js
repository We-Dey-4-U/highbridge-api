const Realtor = require("../models/Realtor");
const { sendEmail } = require("../config/emailService");

// Generate a new unique referral code
const getNextReferralCode = async () => {
    try {
        let newReferralCode = 1000; // Start from 1000

        // Get the last assigned referral code
        const lastRealtor = await Realtor.findOne().sort({ "Referral Code": -1 });
        if (lastRealtor && Number.isInteger(lastRealtor["Referral Code"])) {
            newReferralCode = lastRealtor["Referral Code"] + 1;
        }

        // Ensure uniqueness in case of race conditions
        let uniqueCodeFound = false;
        while (!uniqueCodeFound) {
            const existingCode = await Realtor.findOne({ "Referral Code": newReferralCode });
            if (!existingCode) {
                uniqueCodeFound = true;
            } else {
                newReferralCode++;
            }
        }

        return newReferralCode;
    } catch (error) {
        console.error("Error generating referral code:", error);
        throw new Error("Could not generate referral code");
    }
};

// Generate a new unique serial number
const getNextSerialNumber = async () => {
    try {
        const lastRealtor = await Realtor.findOne().sort({ serialNumber: -1 });
        return lastRealtor && Number.isInteger(lastRealtor.serialNumber) ? lastRealtor.serialNumber + 1 : 1;
    } catch (error) {
        console.error("Error generating serial number:", error);
        throw new Error("Could not generate serial number");
    }
};

// Register a new realtor
exports.registerRealtor = async (req, res) => {
    try {
        let {
            Name,
            Email,
            Username,
            Mobile,
            Gender,
            "Date Of Birth": dob,
            Address,
            "Bank Name": bankName,
            "Account Name": accountName,
            "Account Number": accountNumber,
            "Referral Code": referralCode,
        } = req.body;

        if (!dob || isNaN(Date.parse(dob))) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }

        // Convert DOB format to "3-Jul-74"
        const dateObj = new Date(dob);
        dob = `${dateObj.getDate()}-${dateObj.toLocaleString("default", { month: "short" })}-${dateObj.getFullYear() % 100}`;

        const existingRealtor = await Realtor.findOne({ Email });
        if (existingRealtor) {
            return res.status(400).json({ message: "Email already exists" });
        }

        let Referrer = "";
        if (referralCode) {
            referralCode = parseInt(referralCode, 10);
            if (!Number.isInteger(referralCode) || referralCode < 1000 || referralCode > 9999) {
                return res.status(400).json({ message: "Invalid referral code format" });
            }

            const referrer = await Realtor.findOne({ "Referral Code": referralCode });
            if (!referrer) {
                return res.status(400).json({ message: "Referral code not found in the database" });
            }

            Referrer = referrer.Username;
            referrer["No Of Referrals"] = (referrer["No Of Referrals"] || 0) + 1;
            await referrer.save();
        }

        const newReferralCode = await getNextReferralCode();
        const newSerialNumber = await getNextSerialNumber();

        const realtorData = {
            Name,
            Email,
            Username: Username || null,
            Mobile,
            Gender,
            "Date Of Birth": dob,
            Address,
            "Bank Name": bankName,
            "Account Name": accountName,
            "Account Number": accountNumber,
            "Referral Code": newReferralCode,
            serialNumber: newSerialNumber,
            Referrer,
            "No Of Referrals": 0,
            "Date & Time": new Date().toLocaleString("en-US", { hour12: true }),
        };

        const newRealtor = new Realtor(realtorData);
        await newRealtor.save();

        const emailContent = `
            <h3>Welcome, ${Name}!</h3>
            <p>You have successfully registered as a realtor.</p>
            <p>Your referral code: <strong>${newReferralCode}</strong></p>
        `;
        await sendEmail(Email, "Realtor Registration Successful", emailContent);

        res.status(201).json({ message: "Registration successful!", realtor: newRealtor });
    } catch (error) {
        console.error("Error during realtor registration:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all realtors (for admin)
exports.getAllRealtors = async (req, res) => {
    try {
        const realtors = await Realtor.find();
        res.json(realtors);
    } catch (error) {
        console.error("Error fetching realtors:", error);
        res.status(500).json({ message: "Error fetching realtors", error: error.message });
    }
};
