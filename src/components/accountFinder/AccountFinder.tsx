"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

interface Account {
  accountNo: string;
  name: string;
  holderName: string;
}

interface AccountFinderProps {
  onAccountSelect: (accountNo: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AccountFinder = ({
  onAccountSelect,
  isModalOpen,
  setIsModalOpen,
}: AccountFinderProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLUListElement | null>(null);

  // Listen for F1 key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsModalOpen]);

  // Fetch all accounts from API when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchAccounts();
    }
  }, [isModalOpen]);

  // Fetch all accounts from API
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/loans", {
        params: { allAccounts: "true" },
      });
      setAccounts(response.data);
      setFilteredAccounts(response.data); // Initially show all accounts
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]);
      setFilteredAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search term changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.trim().toLowerCase();
    setSearchTerm(term);

    // Filter accounts based on search term
    if (!term) {
      setFilteredAccounts(accounts); // Show all accounts if search term is empty
    } else {
      const filtered = accounts.filter((account) => {
        // Exact match for accountNo
        if (account.accountNo.toLowerCase() === term) {
          return true;
        }
        // Partial match for name
        if (account.holderName.toLowerCase().includes(term)) {
          return true;
        }
        return false;
      });
      setFilteredAccounts(filtered);

      // Reset or set highlighted index based on filtered results
      if (filtered.length > 0) {
        setHighlightedIndex(0); // Highlight the first item
      } else {
        setHighlightedIndex(-1); // No items to highlight
      }
    }
  };

  // Focus the search input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  // Scroll the highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listContainerRef.current) {
      const listItems = listContainerRef.current.querySelectorAll("li");
      const highlightedItem = listItems[highlightedIndex];
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [highlightedIndex, filteredAccounts]);

  // Handle keyboard navigation inside the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isModalOpen || filteredAccounts.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredAccounts.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const selectedAccount = filteredAccounts[highlightedIndex];
      onAccountSelect(selectedAccount.accountNo);
      setIsModalOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsModalOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  };

  // Handle account selection via click
  const handleSelectAccount = (selectedAccountNo: string) => {
    onAccountSelect(selectedAccountNo); // Call this first
    setSearchTerm("");
    setHighlightedIndex(-1);
    setIsModalOpen(false); // Close modal last
  };

  return (
    <div>
      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation(); // Prevent the event from propagating to the global listener
              setIsModalOpen(false); // Close the modal
              setSearchTerm("");
              setHighlightedIndex(-1);
            }
          }}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            {/* Modal Content */}
            <h2 id="modal-title" className="text-xl font-bold mb-4">
              Find Account
            </h2>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Search by Account No. or Name"
              className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {loading ? (
              <p className="text-gray-500">Loading accounts...</p>
            ) : filteredAccounts.length > 0 ? (
              <ul
                ref={listContainerRef}
                className="mt-4 max-h-60 overflow-y-auto border border-gray-300 rounded-md"
              >
                {filteredAccounts.map((account, index) => (
                  <li
                    key={account.accountNo}
                    onClick={() => handleSelectAccount(account.accountNo)}
                    className={`px-4 py-2 cursor-pointer ${
                      index === highlightedIndex ? "bg-gray-100" : ""
                    } hover:bg-gray-100`}
                  >
                    <div className="font-medium uppercase">{account.holderName}</div>
                    <div className="text-sm text-gray-500">{account.accountNo}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No accounts found.</p>
            )}
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSearchTerm("");
                setHighlightedIndex(-1);
              }}
              className="mt-4 w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountFinder;