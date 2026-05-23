import ImageKit from "imagekit";
import {v4 as uuidv4} from 'uuid';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const uploadFile = (filename,buffer,folder="/products")=>{
    return new Promise((resolve,reject)=>{
        imagekit.upload({
            file: buffer,       
            fileName: uuidv4() + "_" + filename,
            folder: folder
        }, function(error, result) {
            if(error){
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

export { uploadFile };
export default imagekit;