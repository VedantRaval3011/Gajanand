"use client";
import { Ubuntu } from "next/font/google";
import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import ToggleSwitch from "../navbar/toggleSwitch/ToggleSwitch";
import { GuarantorData } from "@/types/types";
import { LoanFormData } from "@/types/types";
import FormInput from "@/components/FormInput/FormInput";
import axios from "axios";
import { validateForm } from "@/utils/validations";
import { useRouter } from "next/navigation";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

export default function LoanForm() {
  const fetchNextAccountNo = async () => {
    try {
      const response = await axios({
        method: "get",
        url: "/api/loans/next-account",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const next = response.data.nextAccountNo;
      setNextAccountNo(next);
      setFormData((prev) => ({
        ...prev,
        accountNo: next,
      }));
    } catch (error) {
      console.error("Error fetching next account number:", error);
      if (axios.isAxiosError(error)) {
        console.log("Status:", error.response?.status);
        console.log("Response:", error.response?.data);
      }
      alert("Failed to fetch next account number");
    }
  };

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [isExisting, setIsExisting] = useState(false);
  const [nextAccountNo, setNextAccountNo] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressEnterCount, setAddressEnterCount] = useState(0);
  const router = useRouter();
  const [formData, setFormData] = useState<LoanFormData>({
    accountNo: "",
    loanNo: "",
    date: formatDate(new Date()),
    mDate: formatDate(new Date()),
    amount: "",
    period: "",
    isDaily: true,
    instAmount: "",
    mAmount: "",
    holderName: "",
    holderAddress: "",
    telephone1: "",
    telephone2: "",
    name: "",
    hasGuarantor: false,
    guarantors: [],
  });

  const initialFormState: LoanFormData = {
    accountNo: "",
    loanNo: "",
    date: formatDate(new Date()),
    mDate: formatDate(new Date()),
    amount: "",
    period: "",
    isDaily: true,
    instAmount: "",
    mAmount: "",
    holderName: "",
    holderAddress: "",
    telephone1: "",
    telephone2: "",
    name: "",
    hasGuarantor: false,
    guarantors: [],
  };

  const [errors, setErrors] = useState<
    Partial<Record<keyof LoanFormData, string>>
  >({});

  const inputRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});

  // Get today's date and day
  const today = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const formattedDate = `${days[today.getDay()]}, ${today.toLocaleDateString(
    "en-IN"
  )}`;

  // Parse DD/MM/YYYY back to a Date object
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate maturity date when period changes
  const calculateMaturityDate = (
    baseDate: string,
    daysToAdd: string
  ): string => {
    if (!daysToAdd || isNaN(Number(daysToAdd))) return baseDate;
    const base = parseDate(baseDate);
    base.setDate(base.getDate() + parseInt(daysToAdd, 10));
    return formatDate(base);
  };

  const focusNextField = (currentField: string) => {
    // Define the exact order you want
    const fieldOrder = [
      "accountNo",
      "loanNo",
      "date",
      "amount",
      "period",
      "isDaily",
      "instAmount",
      "mAmount",
      "mDate",
      "holderName",
      "name",
      "holderAddress", // Make sure address is in the correct position
      "telephone1",
      "telephone2",
      "name",
    ];

    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex > -1 && currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      inputRefs.current[nextField]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextField(field);
    } else if (e.altKey && e.key === "g") {
      e.preventDefault();
      addGuarantor();
    }
     // Add Ctrl+S for form submission
    else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleGuarantorKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
    field: string,
    currentIndex: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const guarantorFields = [
        "holderName",
        "address",
        "telephone",
        "city",
        "name",
      ];
      const currentFieldIndex = guarantorFields.indexOf(field);

      if (currentFieldIndex < guarantorFields.length - 1) {
        // Move to next field in same guarantor
        const nextField = `guarantor-${index}-${
          guarantorFields[currentFieldIndex + 1]
        }`;
        inputRefs.current[nextField]?.focus();
      } else if (currentIndex < formData.guarantors.length - 1) {
        // Move to first field of next guarantor
        const nextIndex = currentIndex + 1;
        const nextField = `guarantor-${nextIndex}-holderName`;
        inputRefs.current[nextField]?.focus();
      }
    }
  };

  const addGuarantor = () => {
    if (!formData.hasGuarantor) {
      setFormData({ ...formData, hasGuarantor: true });
    }
    const newGuarantor: GuarantorData = {
      holderName: "",
      address: "",
      telephone: "",
      city: "",
    };
    setFormData({
      ...formData,
      guarantors: [...formData.guarantors, newGuarantor],
    });
  };

  const removeGuarantor = (index: number) => {
    setFormData({
      ...formData,
      guarantors: formData.guarantors.filter((_, i) => i !== index),
    });
    if (formData.guarantors.length === 1) {
      setFormData((prev) => ({ ...prev, hasGuarantor: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // Convert date strings from DD/MM/YYYY to JavaScript Date objects
      const convertDateString = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/").map(Number);
        return new Date(year, month - 1, day); // month is 0-based in JavaScript
      };

      // Format the data exactly as it's working in Postman
      const submitData = {
        accountNo: formData.accountNo,
        loanNo: formData.loanNo,
        date: convertDateString(formData.date),
        mDate: convertDateString(formData.mDate),
        amount: Number(formData.amount),
        period: Number(formData.period),
        isDaily: formData.isDaily,
        instAmount: Number(formData.instAmount),
        mAmount: Number(formData.mAmount),
        holderName: formData.holderName,
        holderAddress: formData.holderAddress,
        telephone1: formData.telephone1,
        telephone2: formData.telephone2,
        name: formData.name,
        hasGuarantor: formData.hasGuarantor,
        guarantors: formData.guarantors.map((g) => ({
          holderName: g.holderName,
          address: g.address,
          telephone: g.telephone,
          city: g.city,
        })),
      };

      // Make the request with explicit configuration
      const response = await axios({
        method: isExisting ? "put" : "post",
        // Fix the syntax error in the URL construction
        url: isExisting ?  "/api/loans" : `/api/loans`,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: submitData,
      });

      if (response.status === 200 || response.status === 201) {
        alert(isExisting ? "Loan updated successfully!" : "Loan created successfully!");
        
        // Reset form and fetch next account number if it's a new loan
        if (!isExisting) {
          setFormData(initialFormState);
          fetchNextAccountNo();
        }
      }

      // Rest of the code remains the same...
    } catch (error) {
      // Error handling code remains the same...
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this loan?")) return;

    try {
      await axios({
        method: "delete",
        url: `/api/loans/${formData.accountNo}`,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      setFormData(initialFormState);
      fetchNextAccountNo();
      setIsExisting(false);
      alert("Loan deleted successfully!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error Status:", error.response?.status);
        console.error("Error Data:", error.response?.data);
        alert(error.response?.data?.message || "Error deleting loan");
      }
    }
  };

  useEffect(() => {
    fetchNextAccountNo();
  }, []);

  useEffect(() => {
    const handleThemeToggle = (e: WindowEventMap["keydown"]) => {
      if (e.key.toLowerCase() === 'd' && (e.altKey || e.metaKey)) {
        e.preventDefault();
        setIsDarkMode(prev => !prev);
        // Toggle dark class on document
        if (document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      }
    };

    window.addEventListener('keydown', handleThemeToggle);
    return () => window.removeEventListener('keydown', handleThemeToggle);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: WindowEventMap["keydown"]) => {
      if (e.key === "Escape") {
        router.push('/');
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const handleAccountNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, accountNo: value }));

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // Debounce the API call
    timeoutIdRef.current = setTimeout(async () => {
      if (value.trim()) {
        try {
          const response = await axios.get(`/api/loans/${value}`);
          if (response.data) {
            setFormData({
              ...response.data,
              date: formatDate(new Date(response.data.date)),
              mDate: formatDate(new Date(response.data.mDate)),
            });
            setIsExisting(true);
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setIsExisting(false);
            // Reset form but keep the entered account number and preserve nextAccountNo
            if (value === nextAccountNo) {
              // If the entered value is the next account number, keep all fields reset
              setFormData({
                ...initialFormState,
                accountNo: value,
              });
            } else {
              // If it's a different number, reset all fields except accountNo
              setFormData((prev) => ({
                ...initialFormState,
                accountNo: value,
              }));
            }
          } else {
            console.error("Error fetching loan details:", error);
            alert("Failed to fetch loan details");
          }
        }
      }
    }, 500);

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  };
  return (
    <div className={`min-h-screen  ${ubuntu.className}`}>
      <div className=" mx-auto">
        {/* Header Section */}
        <div className="flex justify-between mx-10 items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-orange-600 transition-all">
              Loan Master
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
              {formattedDate}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // Global shortcut for form submission
            if ((e.altKey) && e.key === "s") {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg"
        >
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <FormInput
                label="Account No."
                name="accountNo"
                value={formData.accountNo}
                onChange={handleAccountNoChange}
                onKeyDown={(e) => handleKeyDown(e, "accountNo")}
                error={errors.accountNo}
                inputRef={(el) => {
                  inputRefs.current["accountNo"] = el;
                }}
                required
              />

              <FormInput
                label="Loan No."
                name="loanNo"
                value={formData.loanNo}
                onChange={(e) =>
                  setFormData({ ...formData, loanNo: e.target.value })
                }
                onKeyDown={(e) => handleKeyDown(e, "loanNo")}
                error={errors.loanNo}
                inputRef={(el) => {
                  inputRefs.current["loanNo"] = el;
                }}
                required
              />

              {/* Today's Date */}
              <div className="space-y-6">
                <FormInput
                  label="Date"
                  name="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "date")}
                  error={errors.date}
                  inputRef={(el) => {
                    inputRefs.current["date"] = el;
                  }}
                  required
                />
              </div>
              <div>
                <FormInput
                  label="Amount"
                  name="amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "amount")}
                  error={errors.amount}
                  inputRef={(el) => {
                    inputRefs.current["amount"] = el;
                  }}
                  required
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <FormInput
                  label="Period (Days)"
                  name="period"
                  type="number"
                  value={formData.period}
                  onChange={(e) => {
                    const newPeriod = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      period: newPeriod,
                      mDate: calculateMaturityDate(prev.date, newPeriod),
                    }));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, "period")}
                  inputRef={(el) => {
                    inputRefs.current["period"] = el;
                  }}
                  required
                />
              </div>

              <div className="p-3">
                <label className="block text-xl font-medium text-gray-700 dark:text-gray-300">
                  Payment Type
                </label>
                <div className="flex space-x-6 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.isDaily}
                      ref={(el) => {
                        inputRefs.current["isDaily"] = el;
                      }}
                      onKeyDown={(e) => handleKeyDown(e, "isDaily")}
                      onChange={() =>
                        setFormData({ ...formData, isDaily: true })
                      }
                      className="w-5 h-5 mr-2"
                    />
                    <span className="text-xl dark:text-gray-200 text-black">Daily</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.isDaily}
                      onChange={() =>
                        setFormData({ ...formData, isDaily: false })
                      }
                      ref={(el) => {
                        inputRefs.current["isDaily"] = el;
                      }}
                      onKeyDown={(e) => handleKeyDown(e, "isDaily")}
                      className="w-5 h-5 mr-2 "
                    />
                    <span className="text-xl dark:text-gray-200 text-black">Monthly</span>
                  </label>
                </div>
              </div>

              <div>
                <FormInput
                  label="Installment Amount"
                  name="instAmount"
                  value={formData.instAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, instAmount: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "instAmount")}
                  error={errors.instAmount}
                  inputRef={(el) => {
                    inputRefs.current["instAmount"] = el;
                  }}
                  required
                />
              </div>

              <div>
                <FormInput
                  label="Maturity Amount"
                  name="mAmount"
                  value={formData.mAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, mAmount: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "mAmount")}
                  error={errors.mAmount}
                  inputRef={(el) => {
                    inputRefs.current["mAmount"] = el;
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Maturity Date Section */}
          <div className="mt-6 flex justify-start w-80">
            <div className="flex items-center space-x-4">
              <label className="text-xl font-medium text-gray-700 dark:text-gray-200">
                M. Date:
              </label>
              <input
                type="text"
                readOnly
                ref={(el) => {
                  inputRefs.current["mDate"] = el;
                }}
                value={formData.mDate}
                onChange={(e) =>
                  setFormData({ ...formData, mDate: e.target.value })
                }
                onKeyDown={(e) => handleKeyDown(e, "mDate")}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Holder Information */}
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
              Holder Information
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="col-span-2 md:col-span-1">
                <FormInput
                  label="Holder Name"
                  name="holderName"
                  value={formData.holderName}
                  onChange={(e) =>
                    setFormData({ ...formData, holderName: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "holderName")}
                  error={errors.holderName}
                  inputRef={(el) => {
                    inputRefs.current["holderName"] = el;
                  }}
                  required
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <FormInput
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, "name")}
                  error={errors.name}
                  inputRef={(el) => {
                    inputRefs.current["name"] = el;
                  }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                  Address
                </label>
                <textarea
                  name="holderAddress"
                  id="holderAddress"
                  rows={3}
                  ref={(el) => {
                    inputRefs.current["holderAddress"] = el;
                  }}
                  value={formData.holderAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      holderAddress: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setAddressEnterCount((prev) => prev + 1);

                      if (addressEnterCount >= 2) {
                        // Reset the counter and move to telephone1
                        e.preventDefault();
                        setAddressEnterCount(0);
                        inputRefs.current["telephone1"]?.focus();
                      }
                      // For first and second Enter press, let the default behavior handle the newline
                    }
                  }}
                  className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-6">
                <div>
                  <FormInput
                    label="Telephone 1"
                    name="telephone1"
                    value={formData.telephone1}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone1: e.target.value })
                    }
                    onKeyDown={(e) => handleKeyDown(e, "telephone1")}
                    error={errors.telephone1}
                    inputRef={(el) => {
                      inputRefs.current["telephone1"] = el;
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                    Telephone 2
                  </label>
                  <input
                    type="tel"
                    ref={(el) => {
                      inputRefs.current["telephone2"] = el;
                    }}
                    value={formData.telephone2}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone2: e.target.value })
                    }
                    onKeyDown={(e) => handleKeyDown(e, "telephone2")}
                    className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Guarantor Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                Guarantor Information
              </h2>
              <button
                type="button"
                onClick={addGuarantor}
                className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 rounded-md text-xl font-semibold hover:bg-blue-600 dark:hover:bg-blue-700"
              >
                Add Guarantor (ALT+G)
              </button>
            </div>

            {formData.guarantors.map((guarantor, index) => (
              <div
                key={`guarantor-${index}`}
                className="mt-6 p-6 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Guarantor #{index + 1}
                  </h3>
                  <button
                    type="button"
                    key={`remove-${index}`}
                    onClick={() => removeGuarantor(index)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-lg"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div key={`name-field-${index}`}>
                    <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                      Name
                    </label>
                    <input
                      type="text"
                      ref={(el) => {
                        inputRefs.current[`guarantor-${index}-holderName`] = el;
                      }}
                      value={guarantor.holderName}
                      onChange={(e) => {
                        const updatedGuarantors = [...formData.guarantors];
                        updatedGuarantors[index] = {
                          ...updatedGuarantors[index],
                          holderName: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          guarantors: updatedGuarantors,
                        });
                      }}
                      onKeyDown={(e) =>
                        handleGuarantorKeyDown(e, index, "holderName", index)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Address Input */}
                  <div key={`address-field-${index}`}>
                    <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                      Address
                    </label>
                    <input
                      type="text"
                      ref={(el) => {
                        inputRefs.current[`guarantor-${index}-address`] = el;
                      }}
                      value={guarantor.address}
                      onChange={(e) => {
                        const updatedGuarantors = [...formData.guarantors];
                        updatedGuarantors[index] = {
                          ...updatedGuarantors[index],
                          address: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          guarantors: updatedGuarantors,
                        });
                      }}
                      onKeyDown={(e) =>
                        handleGuarantorKeyDown(e, index, "address", index)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Telephone Input */}
                  <div key={`telephone-field-${index}`}>
                    <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                      Telephone
                    </label>
                    <input
                      type="tel"
                      ref={(el) => {
                        inputRefs.current[`guarantor-${index}-telephone`] = el;
                      }}
                      value={guarantor.telephone}
                      onChange={(e) => {
                        const updatedGuarantors = [...formData.guarantors];
                        updatedGuarantors[index] = {
                          ...updatedGuarantors[index],
                          telephone: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          guarantors: updatedGuarantors,
                        });
                      }}
                      onKeyDown={(e) =>
                        handleGuarantorKeyDown(e, index, "telephone", index)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* City Input */}
                  <div key={`city-field-${index}`}>
                    <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
                      City
                    </label>
                    <input
                      type="text"
                      ref={(el) => {
                        inputRefs.current[`guarantor-${index}-city`] = el;
                      }}
                      value={guarantor.city}
                      onChange={(e) => {
                        const updatedGuarantors = [...formData.guarantors];
                        updatedGuarantors[index] = {
                          ...updatedGuarantors[index],
                          city: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          guarantors: updatedGuarantors,
                        });
                      }}
                      onKeyDown={(e) =>
                        handleGuarantorKeyDown(e, index, "city", index)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 ${
                isExisting
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white px-6 py-3 rounded-md text-xl font-semibold transition-colors`}
            >
              {isSubmitting
                ? "Processing..."
                : isExisting
                ? "Update Loan (ALT+S)"
                : "Submit Loan Application (ALT+S)"}
            </button>
            {isExisting && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500 text-white px-6 py-3 rounded-md text-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Delete Loan
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormState);
                fetchNextAccountNo();
                setIsExisting(false);
              }}
              className="bg-gray-500 text-white px-6 py-3 rounded-md text-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
