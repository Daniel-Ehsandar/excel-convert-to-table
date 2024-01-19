import { useState, useEffect } from "react";
import "./Input.css";
import TickImg from "../../documents/icons2/tick_circle.svg";
import CloseImg from "../../documents/icons2/close_circle.svg";
import callApi from "../../service/callApi";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const Input = () => {
  const [excelData, setExcelData] = useState<string>(""); // Specify the type as string
  const [showTable, setShowTable] = useState<boolean>(false); // Specify the type as boolean
  const [errorMessageVisible, setErrorMessageVisible] =
    useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Add type annotation for event
    setExcelData(event.target.value);
  };

  const [certItem, setPostcertItem] = useState<any>(); // Avoid using 'any', if possible

  const certField = certItem?.fields;
  console.log(certField);

  const {uid}  = useParams<string>() ;

  useEffect(() => {
    callApi("cert", "item", { admin_tok: uid }).then((results) => {
      setPostcertItem(results);
    });
  }, [uid]); // Include 'uid' in the dependency array

  const handleProcessData = () => {
    if (excelData.trim() === "") {
      setErrorMessageVisible(true);
    } else {
      setShowTable(true);
      setErrorMessageVisible(false);
    }
  };

  return (
    <>
      <div>
        <div className="Input_1">
          <div className="P_1 P_2">افزودن با اکسل</div>
          <div className="P_1 P_3">
            محتوای فایل اکسل خود را در کادر زیر کپی کنید.
          </div>

          <div className="Area">
            <textarea
              value={excelData}
              onChange={handleInputChange}
              id="confirmationForm"
              name="textarea"
              cols={50}
              rows={8}
              className="Input_2"
            />
          </div>
        </div>
      </div>
      {showTable ? (
        <div style={{ marginTop: 16 }}>
          <div className="col-sm-12">
            <div className="Input_1 Input_5 mt-4">
              <div className="P_1 P_2">افزودن افراد</div>
              {/* Display the table with excelData */}
              <TableWithData
                excelData={excelData}
                certField={certField}
                uid={uid}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="Input_3 col-sm-12">
          {/* Display the button to process data */}
          <button
            onClick={handleProcessData}
            className="submitButton btn_Get_Info_1"
          >
            بررسی اطلاعات
          </button>
          {errorMessageVisible && ( // Render error message conditionally
            <div className="error-message  ">
              <img src={CloseImg} className="img_icon-1" />

              <span className="">خطا</span>
              <br />
              <span className="text-span">
                محتوای فایل اکسل را وارد نمایید.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

interface TableWithDataProps {
  excelData: string;
  certField?: { uid: any; description: string }[]; // Make certField optional
  uid: any;
}

const TableWithData: React.FC<TableWithDataProps> = ({
  excelData,
  certField,
  uid,
}) => {
  const navigate = useNavigate();
  const rows = excelData.split("\n").map((row) => row.split("\t"));
  const [selectTagColors, setSelectTagColors] = useState<string[]>(
    new Array(rows[0].length).fill("#E12A02")
  );
  const [successMessageVisible, setSuccessMessageVisible] =
    useState<boolean>(false);
  const [errorMessageVisible, setErrorMessageVisible] =
    useState<boolean>(false);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(
    new Array(rows[0].length).fill("")
  );
  const [selectTagOptions, setSelectTagOptions] = useState<string[][]>([]);

  // Define a type for the rowData object with an index signature
  type RowData = {
    [key: string]: string;
  };

  // Function to handle header selection for a specific column
  const handleHeaderSelect = (index: number, selectedValue: string) => {
    const updatedSelectedHeaders = [...selectedHeaders];
    updatedSelectedHeaders[index] = selectedValue;
    setSelectedHeaders(updatedSelectedHeaders);

    // Update the color state based on the selected value
    const updatedSelectTagColors = [...selectTagColors];
    updatedSelectTagColors[index] =
      selectedValue === "" ? "#E12A02" : "#45ADA7";
    setSelectTagColors(updatedSelectTagColors);

    // Dynamically update select options for the next column based on selectedValue
    if (index < rows[0].length - 1) {
      const updatedSelectTagOptions = [...selectTagOptions];
      updatedSelectTagOptions[index + 1] =
        certField
          ?.filter((result) => result.uid !== selectedValue)
          .map((result) => result.uid) || [];
      setSelectTagOptions(updatedSelectTagOptions);
    }
  };

  // Use useEffect to trigger navigation after a successful API call
  useEffect(() => {
    if (successMessageVisible) {
      // Delay the navigation after a successful API call
      const delay = setTimeout(() => {
        navigate(`/panel/${uid}`);
      }, 5000); // Redirect after 5 seconds (adjust as needed)

      // Clear the timeout if the component unmounts or if successMessageVisible changes
      return () => clearTimeout(delay);
    }
  }, [successMessageVisible, navigate, uid]);

  // Function to collect and send data to the server
const handleSubmitDataAndRedirect = (uid: string) => {
  if (typeof excelData === "string") {
    // Create a data object with the information from the table
    const rows = excelData
      .split("\n")
      .map((row) => row.split("\t").map((cell) => cell.trim()));
    // Create an array to hold the JSON objects
    const jsonData: RowData[] = [];
    // Assuming the first row contains headers, use them as keys
    const headers = selectedHeaders;

    // Start from the second row (index 1 or 0) to create objects
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowData: RowData = {};

      // Check if the row has at least one non-empty cell
      if (row.some((cell) => cell.trim() !== "")) {
        // Iterate through columns and create key-value pairs
        for (let j = 0; j < headers.length; j++) {
          // Check if the cell value is not empty and not marked as "Do Not Send"
          if (headers[j] !== "do_not_send" && row[j].trim() !== "") {
            rowData[headers[j]] = row[j].trim();
          }
        }

        // Add the object to the JSON array if it contains valid data
        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData);
        }
      }
    }

    // Check if all required fields (excluding "Do Not Send") are selected
    const allRequiredFieldsSelected = headers.every(
      (header) => header === "do_not_send" || header !== ""
    );

    if (allRequiredFieldsSelected) {
      // Reset the color state to red for unselected options
      const updatedSelectTagColors = new Array(rows[0].length).fill("#45ADA7");
      setSelectTagColors(updatedSelectTagColors);

      // You can call the API here or perform any other actions with the JSON data
      callApi("cert", "import", { admin_tok: uid, data: jsonData }).then(
        (results) => {
          // Handle the API response or update state as needed
          console.log("API Response:", results);

          // Show success message
          setSuccessMessageVisible(true);

          // Hide the success message after 10 seconds
          setTimeout(() => {
            setSuccessMessageVisible(false);
          }, 5000);
        }
      );
    } else {
      // Reset the color state to white for selected options
      const updatedSelectTagColors = selectTagColors.map((_, index) =>
        selectedHeaders[index] !== "" ? "#45ADA7" : "#E12A02"
      );
      setSelectTagColors(updatedSelectTagColors);

      // Show error message
      setErrorMessageVisible(true);

      // Hide the error message after 10 seconds
      setTimeout(() => {
        setErrorMessageVisible(false);
      }, 5000);

      // Reset the success message visibility
      setSuccessMessageVisible(false);
      console.error("Not all required headers are selected.");
    }
  }
};

  return (
    certField && (
      <>
        {/* Second Section */}
        <div
          className="table-responsive"
          style={{ width: "100%", overflowX: "auto" }}
        >
          <table className="table table_1 ">
            <thead className="">
              <tr role="row">
                {selectedHeaders.map((selectedHeader, headerIndex) => (
                  <th key={headerIndex}>
                    <select
                      style={{
                        border: `1px solid ${
                          selectedHeader === "#697b87"
                            ? "#E12A02"
                            : selectTagColors[headerIndex]
                        }`,
                      }}
                      className={`SE-1`}
                      dir="rtl"
                      defaultValue={selectedHeader}
                      onChange={(e) =>
                        handleHeaderSelect(headerIndex, e.target.value)
                      }
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="do_not_send">نادیده گرفتن </option>
                      {certField.map((results) => (
                        <option
                          key={results.uid}
                          value={results.uid}
                          disabled={selectedHeaders
                            .slice(0, headerIndex)
                            .includes(results.uid)}
                        >
                          {results.description}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody style={{ borderStyle: "none" }}>
              {rows.map((row, rowIndex) => (
                <tr style={{ borderStyle: "none" }} key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{ color: " #697B87", borderStyle: "none" }}
                      className="TD-Table"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Display the button to submit data */}
        <button
          onClick={() => handleSubmitDataAndRedirect(uid)}
          className="submitButton btn_Get_Info_1"
          style={{ marginTop: "24px" }}
        >
          ثبت اطلاعات
        </button>

        {/* Display success message */}
        {successMessageVisible && (
          <div className="success-message ">
            <img src={TickImg} className="img_icon-1" />

            <span className="">موفق</span>
            <br />
            <span className="text-span">اطلاعات با موفقیت ثبت شد</span>
          </div>
        )}

        {/* Display error message */}
        {errorMessageVisible && (
          <div className="error-message  ">
            <img src={CloseImg} className="img_icon-1" />

            <span className="">خطا</span>
            <br />
            <span className="text-span">لطفا همه فیلد ها را مشخص نمایید</span>
          </div>
        )}
      </>
    )
  );
};
export default Input;
