import moogoose from 'mongoose';

const connectDB = async () => {
    try {

            await moogoose.connect(process.env.MONGO_URI)
            console.log('MongoDB connected successfully');
        
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

export default connectDB;