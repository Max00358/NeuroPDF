import React, { useState } from "react";
import axios from "axios";

import { Input } from "antd"
const { Search } = Input
const DOMAIN = process.env.REACT_APP_DOMAIN;

const searchContainer = {
    display: "flex",
    justifyContent: "center"
};

const ChatComponent = (props) => {
    const { handleResp, isLoading, setIsLoading, filePath} = props;

    // searchValue is user's input text, we dig them out from Search->onSearch
    const [searchValue, setSearchValue] = useState("")

    const handleChange = (e) => {
        setSearchValue(e.target.value);
    };
    const onSearch = async(question)=>{
        setSearchValue(""); // clear text box after msg sent
        setIsLoading(true);

        try{
            const response = await axios.post(`${DOMAIN}/chat`, {
                message: question,
                filePath    // filePath to PDF
            });
            const response_str = response.data?.answer || "No Response Data :(";
            handleResp(question, response_str);
        }
        catch(error){
            console.error(`Error: ${error}`);
            // ? is nullish-safety check, ?. is optional chaining
            const safeMsg = error?.response?.data || error.message || "ChatComponents->onSearch Error";
            handleResp(question, safeMsg.toString());
        }
        finally{
            setIsLoading(false);
        }
    }

    return (
        <div style={searchContainer}>
            {/* the search bar implementation */}
            <Search
                placeholder="Ask Anything"
                enterButton="Ask"
                size="large"
                onSearch={onSearch}
                value={searchValue}
                onChange={handleChange}
            />
        </div>
    )
};

export default ChatComponent;