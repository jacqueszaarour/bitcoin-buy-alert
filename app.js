const axios = require('axios');
const nodemailer = require('nodemailer');

(async () => {
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
        if (dipPercentage >= 30) return { amount: 1500, dipPercentage };
        if (dipPercentage >= 20) return { amount: 1000, dipPercentage };
        if (dipPercentage >= 5) return { amount: 500, dipPercentage };
        return { amount: 0, dipPercentage };
    }

    // Send email notification
    async function sendEmail(amount, dipPercentage, currentPrice) {
        if (amount === 0) {
            console.log('No significant dip detected. No email sent.');
            return;
        }

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: '"Bitcoin Buy Alert" <' + process.env.EMAIL_USER + '>',
            to: process.env.EMAIL_TO,
            subject: 'Bitcoin Buy Alert',
            text: `Bitcoin has dipped ${dipPercentage.toFixed(2)}% from the monthly high.\nCurrent Price: $${currentPrice.toFixed(2)}\nSuggested Investment: $${amount}\n\nIt's time to buy according to your strategy!`,
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

    const { amount, dipPercentage } = calculateInvestment(currentPrice, monthlyHigh);

    console.log(`Current Price: $${currentPrice}`);
    console.log(`Monthly High: $${monthlyHigh}`);
    console.log(`Dip Percentage: ${dipPercentage.toFixed(2)}%`);

    await sendEmail(amount, dipPercentage, currentPrice);
})();
