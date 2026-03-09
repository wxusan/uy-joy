import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "nasux1222@gmail.com";
    const password = "Iltimosxopde1";
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("Developer user already exists, updating role...");
        await prisma.user.update({
            where: { email },
            data: { role: "developer", password: hashedPassword },
        });
    } else {
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: "Developer",
                role: "developer",
            },
        });
    }

    console.log("✅ Developer user created/updated successfully");
    console.log(`   Email: ${email}`);
    console.log("   Role: developer");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
