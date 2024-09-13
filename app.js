const axios = require('axios');
const nodemailer = require('nodemailer');

(async () => {
    // Check if today is Monday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.


    // Fetch current Bitcoin price
    async function fetchCurrentPrice() {
        try {
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price',
                {
                    params: {
                        ids: 'bitcoin',
                        vs_currencies: 'usd',
                    },
                }
            );
            return response.data.bitcoin.usd;
        } catch (error) {
            console.error('Error fetching current price:', error);
        }
    }

    // Fetch the highest price in the last 30 days
    async function fetchMonthlyHigh() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range',
                {
                    params: {
                        vs_currency: 'usd',
                        from: thirtyDaysAgo,
                        to: now,
                    },
                }
            );
            const prices = response.data.prices;
            const highPrice = Math.max(...prices.map((price) => price[1]));
            return highPrice;
        } catch (error) {
            console.error('Error fetching monthly high:', error);
        }
    }

    // Calculate dip percentage and investment amount
    function calculateInvestment(currentPrice, monthlyHigh) {
        const dipPercentage = ((monthlyHigh - currentPrice) / monthlyHigh) * 100;
        let additionalAmount = 0;

        if (dipPercentage >= 20) {
            additionalAmount = 600;
        } else if (dipPercentage >= 10) {
            additionalAmount = 400;
        } else if (dipPercentage >= 5) {
            additionalAmount = 200;
        } else {
            additionalAmount = 0;
        }

        const baseAmount = 200;
        let totalAmount = baseAmount + additionalAmount;

        // Apply weekly cap of $1,000
        if (totalAmount > 1000) {
            totalAmount = 1000;
        }

        return { amount: totalAmount, dipPercentage, additionalAmount };
    }

    // Send email notification
    async function sendEmail(amount, dipPercentage, currentPrice, additionalAmount, monthlyHigh) {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: '"Bitcoin Investment Alert" <' + process.env.EMAIL_USER + '>',
            to: process.env.EMAIL_TO,
            subject: 'Bitcoin Weekly Investment Alert',
            text: `Weekly Bitcoin Investment Plan:

Current Price: $${currentPrice.toFixed(2)}
Monthly High: $${monthlyHigh.toFixed(2)}
Dip Percentage from Monthly High: ${dipPercentage.toFixed(2)}%

Base Investment: $200
Additional Investment due to Dip: $${additionalAmount}

Total Suggested Investment for this Week: $${amount}

Time to execute your weekly investment according to your strategy!`,
        };

        try {
            let info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }

    // Main execution
    const [currentPrice, monthlyHigh] = await Promise.all([
        fetchCurrentPrice(),
        fetchMonthlyHigh(),
    ]);

    const { amount, dipPercentage, additionalAmount } = calculateInvestment(currentPrice, monthlyHigh);

    console.log(`Current Price: $${currentPrice}`);
    console.log(`Monthly High: $${monthlyHigh}`);
    console.log(`Dip Percentage: ${dipPercentage.toFixed(2)}%`);
    console.log(`Base Investment: $200`);
    console.log(`Additional Investment due to Dip: $${additionalAmount}`);
    console.log(`Total Investment Amount: $${amount}`);

    await sendEmail(amount, dipPercentage, currentPrice, additionalAmount, monthlyHigh);
})();
