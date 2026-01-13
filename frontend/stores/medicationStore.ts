import { create } from 'zustand';
import { postNewMedication } from '../api/medicationService';
import { MedicationModel, NewMedication } from '../types';

// Define the shape of our store's state and its actions
interface MedicationState {
    medications: MedicationModel[];
    isLoading: boolean;
    error: string | null;
    // Action to add a new medication
    addMedication: (newMedication: NewMedication) => Promise<boolean>; // Returns true on success, false on failure
    // You would also add actions like:
    // fetchMedications: (userId: string) => Promise<void>;
    // updateMedication: (medication: Medication) => Promise<boolean>;
}

export const useMedicationStore = create<MedicationState>((set) => ({
    // Initial state
    medications: [], // Starts empty, could be populated with fetchMedications
    isLoading: false,
    error: null,

    // --- ACTIONS ---

    /**
     * Attempts to save a new medication via the API and updates the state accordingly.
     * @param newMedication The medication data from the form.
     * @returns A boolean indicating if the operation was successful.
     */
    addMedication: async (newMedication: NewMedication) => {
        // Set loading state and clear any previous errors
        set({ isLoading: true, error: null });
        try {
            // Call the isolated API service
            const addedMed = await postNewMedication(newMedication);

            // On success, add the new medication to the state and reset loading
            set((state) => ({
                medications: [addedMed, ...state.medications], // Add to the top of the list
                isLoading: false,
            }));
            
            return true; // Signal success to the UI
        } catch (err: any) {
            // On failure, set the error message and reset loading
            set({
                isLoading: false,
                error: err.message || 'An unknown error occurred.',
            });
            
            return false; // Signal failure to the UI
        }
    },
}));