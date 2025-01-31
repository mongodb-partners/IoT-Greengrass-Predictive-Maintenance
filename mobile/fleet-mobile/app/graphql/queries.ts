// GraphQL Queries (to be placed in a separate file)
export const CREATE_ITEM = `
  mutation CreateItem(
    $id: ID
    $address: String,
    $age: Int,
    $city: String,
    $credit_amount: Int,
    $credit_history: String,
    $current_employer: String,
    $date_of_birth: String,
    $duration_of_credit: Int,
    $foreign_worker: String,
    $full_name: String,
    $housing: String,
    $installment_rate_in_percentage_of_disposable_income: Int,
    $job: String,
    $job_title: String,
    $maritial_status: String,
    $monthly_expenses: Int,
    $monthly_income: Int,
    $number_of_existing_credits_at_this_bank: Int,
    $number_of_people_being_liable_to_provide_maintenance_for: Int,
    $other_debtors_guarantors: String,
    $other_installment_plans: String,
    $other_sources_of_income: String,
    $postal_code: String,
    $present_employment_since: String,
    $present_residence_since: Int,
    $property: String,
    $purpose: String,
    $savings_account_bonds: String,
    $sex: String,
    $state: String,
    $status: String,
    $status_of_existing_checking_account: String,
    $telephone: String,
    $telephone_number: String,
    $user: ID
  ) {
    createItem(
      payload: {
        _id: $id,
        address: $address,
        age: $age,
        city: $city,
        credit_amount: $credit_amount,
        credit_history: $credit_history,
        current_employer: $current_employer,
        date_of_birth: $date_of_birth,
        duration_of_credit: $duration_of_credit,
        foreign_worker: $foreign_worker,
        full_name: $full_name,
        housing: $housing,
        installment_rate_in_percentage_of_disposable_income: $installment_rate_in_percentage_of_disposable_income,
        job: $job,
        job_title: $job_title,
        maritial_status: $maritial_status,
        monthly_expenses: $monthly_expenses,
        monthly_income: $monthly_income,
        number_of_existing_credits_at_this_bank: $number_of_existing_credits_at_this_bank,
        number_of_people_being_liable_to_provide_maintenance_for: $number_of_people_being_liable_to_provide_maintenance_for,
        other_debtors_guarantors: $other_debtors_guarantors,
        other_installment_plans: $other_installment_plans,
        other_sources_of_income: $other_sources_of_income,
        postal_code: $postal_code,
        present_employment_since: $present_employment_since,
        present_residence_since: $present_residence_since,
        property: $property,
        purpose: $purpose,
        savings_account_bonds: $savings_account_bonds,
        sex: $sex,
        state: $state,
        status: $status,
        status_of_existing_checking_account: $status_of_existing_checking_account,
        telephone: $telephone,
        telephone_number: $telephone_number,
        user: $user
      }
    ) {
      success
      error
      data {
        address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        status_of_existing_checking_account
        telephone
        telephone_number
        user
      }
    }
  }
`;


export const VECTOR_SEARCH = `
  query VectorSearch($text_embedding: [Float!]) {
    vectorSearch(text_embedding: $text_embedding) {
      data {
        _id
         address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        status_of_existing_checking_account
        telephone
        telephone_number
        user
      }
      error
      success
    }
  }
`;


export const GET_ALL_ITEMS = `
  query GetAllItems {
    getAllItems {
      data {
        _id
         address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        status_of_existing_checking_account
        telephone
        telephone_number
        user
      }
      error
      success
    }
  }
`;


export const GET_ALL_ITEMS_USER = `
  query GetAllItemsByUser {
    getAllItemsByUser {
      data {
        _id
         address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        risk
        application_summary
        application_summary_embedding
        score
        status_of_existing_checking_account
        telephone
        telephone_number
        user
      }
      error
      success
    }
  }
`;

export const DELETE_ITEM = `
  mutation DeleteItem($id: ID!) {
    deleteItem(payload: { _id: $id }) {
      success
      error
      data
    }
  }
`;

export const UPDATE_ITEM = `
  mutation UpdateItem(
    $id: ID!
    $address: String,
    $age: Int,
    $city: String,
    $credit_amount: Int,
    $credit_history: String,
    $current_employer: String,
    $date_of_birth: String,
    $duration_of_credit: Int,
    $foreign_worker: String,
    $full_name: String,
    $housing: String,
    $installment_rate_in_percentage_of_disposable_income: Int,
    $job: String,
    $job_title: String,
    $maritial_status: String,
    $monthly_expenses: Int,
    $monthly_income: Int,
    $number_of_existing_credits_at_this_bank: Int,
    $number_of_people_being_liable_to_provide_maintenance_for: Int,
    $other_debtors_guarantors: String,
    $other_installment_plans: String,
    $other_sources_of_income: String,
    $postal_code: String,
    $present_employment_since: String,
    $present_residence_since: Int,
    $property: String,
    $purpose: String,
    $savings_account_bonds: String,
    $sex: String,
    $state: String,
    $status: String,
    $status_of_existing_checking_account: String,
    $telephone: String,
    $telephone_number: String,
    $user: ID
  ) {
    updateItem(
    payload: { 
        _id: $id,  
        address: $address,
        age: $age,
        city: $city,
        credit_amount: $credit_amount,
        credit_history: $credit_history,
        current_employer: $current_employer,
        date_of_birth: $date_of_birth,
        duration_of_credit: $duration_of_credit,
        foreign_worker: $foreign_worker,
        full_name: $full_name,
        housing: $housing,
        installment_rate_in_percentage_of_disposable_income: $installment_rate_in_percentage_of_disposable_income,
        job: $job,
        job_title: $job_title,
        maritial_status: $maritial_status,
        monthly_expenses: $monthly_expenses,
        monthly_income: $monthly_income,
        number_of_existing_credits_at_this_bank: $number_of_existing_credits_at_this_bank,
        number_of_people_being_liable_to_provide_maintenance_for: $number_of_people_being_liable_to_provide_maintenance_for,
        other_debtors_guarantors: $other_debtors_guarantors,
        other_installment_plans: $other_installment_plans,
        other_sources_of_income: $other_sources_of_income,
        postal_code: $postal_code,
        present_employment_since: $present_employment_since,
        present_residence_since: $present_residence_since,
        property: $property,
        purpose: $purpose,
        savings_account_bonds: $savings_account_bonds,
        sex: $sex,
        state: $state,
        status: $status,
        status_of_existing_checking_account: $status_of_existing_checking_account,
        telephone: $telephone,
        telephone_number: $telephone_number,
        user: $user
    }) {
      success
      error
      data {
        address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        risk
        application_summary
        application_summary_embedding
        score
        status_of_existing_checking_account
        telephone
        telephone_number
        user
      }
    }
  }
`;


// GraphQL Subscriptions
export const SUBSCRIBE_TO_MONGO_INSERT_EVENT = `
  subscription MongoInsertEvent($user: ID!) {
    mongoInsertEvent (user: $user) {
        _id
        address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        risk
        application_summary
        application_summary_embedding
        score
        status_of_existing_checking_account
        telephone
        telephone_number
        user
    }
  }
`;

export const SUBSCRIBE_TO_MONGO_UPDATE_EVENT = `
  subscription MongoUpdateEvent($user: ID!) {
    mongoUpdateEvent(user: $user) {
        _id
        address
        age
        city
        credit_amount
        credit_history
        current_employer
        date_of_birth
        duration_of_credit
        foreign_worker
        full_name
        housing
        installment_rate_in_percentage_of_disposable_income
        job
        job_title
        maritial_status
        monthly_expenses
        monthly_income
        number_of_existing_credits_at_this_bank
        number_of_people_being_liable_to_provide_maintenance_for
        other_debtors_guarantors
        other_installment_plans
        other_sources_of_income
        postal_code
        present_employment_since
        present_residence_since
        property
        purpose
        savings_account_bonds
        sex
        state
        status
        risk
        application_summary
        application_summary_embedding
        score
        status_of_existing_checking_account
        telephone
        telephone_number
        user
    }
  }
`;

export const SUBSCRIBE_TO_MONGO_DELETE_EVENT = `
  subscription MongoDeleteEvent {
    mongoDeleteEvent {
      _id
    }
  }
`;