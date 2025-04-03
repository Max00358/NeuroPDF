import React from "react";
import axios from "axios";
import { InboxOutlined } from "@ant-design/icons";
import { message, Upload } from "antd";

const { Dragger } = Upload;
const DOMAIN = "http://localhost:5001";

const PdfUploader = (props) => {
    const {setFilePath} = props;

    const uploadToBackend = async(file) => {
        const formData = new FormData();
        formData.append("file", file);
    
        try{
            const response = await axios.post(`${DOMAIN}/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            const { filePath } = response.data;
            setFilePath(filePath);
            return filePath;
        }
        catch(error){
            console.error(`Error Uploading File: ${error}`);
            return null;
        }
    };

    const attributes = {
        name: "file", 
        multiple: false,
        customRequest: async({ file, onSuccess, onError }) => {
            // the response is just a filePath
            const filePath = await uploadToBackend(file, setFilePath);
            if(filePath){
                onSuccess("Upload successful");
            }
            else{
                onError(new Error("Upload Failed"));
            }
        },
        onChange(info){
            const { status } = info.file;
            if(status !== "uploading"){
                console.log(info.file, info.fileList);
            }
    
            if(status === "done"){
                message.success(`${info.file.name} file uploaded successfully`);
            }
            else if(status === "error"){
                message.error(`${info.file.name} file upload failed`);
            }
        },
        onDrop(e){
            console.log("Dropped files", e.dataTransfer.files);
        }
    };

    return (
        <Dragger {...attributes}>
            <p className="ant-upload-drag-icon">
                <InboxOutlined /> {/* built in ant-design upload icon*/}
            </p>
            <p className="ant-upload-text">
                Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
                Support for a single or bulk upload. Strictly prohibited from uploading
                company data or other banned files.
            </p>
        </Dragger>
    );
}

export default PdfUploader;