# Firestore ERD

ERD ini adalah logical ERD dari struktur Firestore export. Karena Firestore bersifat NoSQL, relasi di bawah dibaca sebagai relasi lewat `documentId` dan field referensi, bukan foreign key database fisik.

## Struktur Collection

```text
users/{userId}
company_profiles/{userId}
counters/{userId}
car_references/{brand}

customer_data/{userId}/customers/{customerId}
car_data/{userId}/cars/{carId}
quotation_records/{userId}/quotations/{quotationId}
invoice_records/{userId}/invoices/{invoiceId}
payment_records/{userId}/payments/{paymentId}
kwitansi_records/{userId}/kwitansi/{kwitansiId}
renewal_records/{userId}/renewals/{renewalId}
```

## ERD Mermaid

```mermaid
erDiagram
    users ||--o| company_profiles : "users.userId = company_profiles.userId"
    users ||--o| counters : "users.userId = counters.userId"
    users ||--o{ customer_data : "users.userId = customer_data.userId"
    users ||--o{ car_data : "users.userId = car_data.userId"
    users ||--o{ quotation_records : "users.userId = quotation_records.userId"
    users ||--o{ invoice_records : "users.userId = invoice_records.userId"
    users ||--o{ payment_records : "users.userId = payment_records.userId"
    users ||--o{ kwitansi_records : "users.userId = kwitansi_records.userId"
    users ||--o{ renewal_records : "users.userId = renewal_records.userId"

    customer_data ||--o{ car_data : "customer_data.customerId = car_data.customerId"
    customer_data ||--o{ quotation_records : "customer_data.customerId = quotation_records.customerId"
    customer_data ||--o{ invoice_records : "customer_data.customerId = invoice_records.customerId"
    customer_data ||--o{ payment_records : "customer_data.customerId = payment_records.customerId"
    customer_data ||--o{ renewal_records : "customer_data.customerId = renewal_records.customerId"

    car_data ||--o{ quotation_records : "car_data.carId = quotation_records.carId"
    car_data ||--o{ invoice_records : "car_data.carId = invoice_records.carId"
    car_data ||--o{ payment_records : "car_data.carId = payment_records.carId"
    car_data ||--o{ renewal_records : "car_data.carId = renewal_records.carId"

    quotation_records ||--o| invoice_records : "quotation_records.quotationId = invoice_records.quotationId"
    invoice_records ||--o{ payment_records : "invoice_records.invoiceId = payment_records.invoiceNumber"
    payment_records ||--o| kwitansi_records : "payment_records.paymentId = kwitansi_records.paymentId"
    renewal_records ||--o{ quotation_records : "renewal_records.renewalId = quotation_records.renewalId"
    renewal_records ||--o| invoice_records : "renewal_records.renewalId = invoice_records.renewalId"
    renewal_records ||--o| payment_records : "renewal_records.renewalId = payment_records.renewalId"

    car_references ||--o{ car_data : "car_references.brand = car_data.carData.carBrand"

    users {
        string userId PK
        string username
        string fullName
        string email
        string firebaseUid
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    company_profiles {
        string userId PK_FK
        string companyName
        string companySubtitle
        string companyCity
        object companyLogo
        timestamp createdAt
        timestamp updatedAt
    }

    counters {
        string userId PK_FK
        number customerCount
        number carCount
        number invoiceCount
        number paymentCount
        number kwitansiCount
        number renewalCount
    }

    customer_data {
        string customerId PK
        string userId FK
        string name
        string phone
        string email
        string address
        string status
        string notes
        timestamp createdAt
        timestamp updatedAt
    }

    car_data {
        string carId PK
        string userId FK
        string customerId FK
        object carData
        object carPhotos
        object documentPhotos
        string status
        string notes
        timestamp createdAt
        timestamp updatedAt
    }

    quotation_records {
        string quotationId PK
        string userId FK
        string customerId FK
        string carId FK
        string renewalId FK
        string quotationNumber
        string insuranceProvider
        string insuranceType
        object coverages
        number tsi
        number totalPremium
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    invoice_records {
        string invoiceId PK
        string userId FK
        string customerId FK
        string carId FK
        string quotationId FK
        string renewalId FK
        string invoiceNumber
        array items
        number subTotal
        number discount
        number grandTotal
        string status
        timestamp issueDate
        timestamp dueDate
        timestamp createdAt
        timestamp updatedAt
    }

    payment_records {
        string paymentId PK
        string userId FK
        string customerId FK
        string carId FK
        string renewalId FK
        string invoiceNumber FK
        number amount
        string status
        string paymentMethod
        string proofUrl
        timestamp dueDate
        timestamp paidDate
        timestamp createdAt
        timestamp updatedAt
    }

    kwitansi_records {
        string kwitansiId PK
        string userId FK
        string paymentId FK
        string kwitansiNumber
        object invoiceData
        number printCount
        string printedBy
        timestamp issuedDate
        timestamp createdAt
        timestamp updatedAt
    }

    renewal_records {
        string renewalId PK
        string userId FK
        string customerId FK
        string carId FK
        string paymentId FK
        date oldStartDate
        date oldEndDate
        date newStartDate
        date newEndDate
        number premium
        string status
        string notes
        timestamp completedAt
        timestamp createdAt
        timestamp updatedAt
    }

    car_references {
        string brand PK
        object models
    }
```

## Catatan Relasi Penting

- `userId` biasanya sama dengan username dan dipakai sebagai parent document, contoh `invoice_records/Josep/invoices/inv-1`.
- Collection `admins` dan field `users.role` sudah tidak dipakai. Semua akun dianggap user biasa dan akses API cukup divalidasi lewat Firebase Auth token.
- `customers.customerId` direferensikan oleh `cars.customerId`, `quotations.customerId`, `invoices.customerId`, `payments.customerId`, dan `renewals.customerId`.
- `cars.carId` direferensikan oleh semua collection yang berhubungan: `quotation_records.carId`, `invoice_records.carId`, `payment_records.carId`, dan `renewal_records.carId`.
- `quotations.quotationId` masuk ke `invoices.quotationId` saat quotation diterima.
- `payments.invoiceNumber` di kode berisi ID dokumen invoice, bukan nomor invoice display.
- `kwitansi.paymentId` mengarah ke `payments.paymentId`.
- Subcollection kwitansi yang aktif adalah `kwitansi_records/{userId}/kwitansi`. Backend masih dapat membaca legacy subcollection `kwitansis` untuk data lama.

## Detail Collection

Although the system uses Firestore which is NoSQL in nature, each collection can still be described as a logical table. The primary key in the details below refers to the Firestore document ID, while relationships are read from reference fields such as `userId`, `createdBy`, `customerId`, `carId`, `policyId`, `quotationId`, `paymentId`, and `renewalId`.

<table>
  <thead>
    <tr>
      <th>Table Name</th>
      <th>Components</th>
      <th>Relationship of the Table</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>users</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, using the username as the Firestore document ID.</li>
          <li><code>username</code> as the account username used for login and document grouping.</li>
          <li><code>fullName</code> as the full name of the user.</li>
          <li><code>email</code> as the email address of the user.</li>
          <li><code>password</code> as the hashed password for legacy or local authentication data.</li>
          <li><code>firebaseUid</code> as the user identifier from Firebase Authentication.</li>
          <li><code>firebaseEmail</code> as the email stored from Firebase Authentication, if available.</li>
          <li><code>role</code> as the legacy role field, no longer used for active authorization.</li>
          <li><code>status</code> as the activity status of the user, for example Active.</li>
          <li><code>createdAt</code> as the timestamp when the user was created.</li>
          <li><code>updatedAt</code> as the timestamp when the user data was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One user can only have one company profile.</li>
          <li>One user can only have one counter document.</li>
          <li>One user can have many customers.</li>
          <li>One user can have many car or policy records.</li>
          <li>One user can create many quotations.</li>
          <li>One user can create many invoices.</li>
          <li>One user can create many payment records.</li>
          <li>One user can print many kwitansi records.</li>
          <li>One user can create many renewal records.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>company_profiles</strong></td>
      <td>
        <ol>
          <li><code>userId</code> as primary key and reference to the user document ID.</li>
          <li><code>companyName</code> as the company name displayed on business documents.</li>
          <li><code>companySubtitle</code> as the company subtitle or supporting description.</li>
          <li><code>companyCity</code> as the company city location.</li>
          <li><code>companyLogo</code> as an object containing logo URL, Cloudinary public ID, upload time, width, height, and format.</li>
          <li><code>createdAt</code> as the timestamp when the company profile was created.</li>
          <li><code>updatedAt</code> as the timestamp when the company profile was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One company profile can only belong to one user.</li>
          <li>One user can only maintain one company profile.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>counters</strong></td>
      <td>
        <ol>
          <li><code>userId</code> as primary key and reference to the user document ID.</li>
          <li><code>customerCount</code> as the latest sequence number used for customer IDs.</li>
          <li><code>carCount</code> as the latest sequence number used for car IDs.</li>
          <li><code>invoiceCount</code> as the latest sequence number used for invoice IDs.</li>
          <li><code>paymentCount</code> as the latest sequence number used for payment IDs.</li>
          <li><code>kwitansiCount</code> as the latest sequence number used for kwitansi IDs.</li>
          <li><code>renewalCount</code> as the latest sequence number used for renewal IDs.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One counter document can only belong to one user.</li>
          <li>One counter document is used to generate sequential IDs for the user's customer, car, invoice, payment, kwitansi, and renewal records.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>customer_data</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated using the user ID and customer sequence number.</li>
          <li><code>name</code> as the customer name.</li>
          <li><code>email</code> as the customer email address.</li>
          <li><code>phone</code> as the customer phone number.</li>
          <li><code>address</code> as the customer address.</li>
          <li><code>notes</code> as additional notes about the customer.</li>
          <li><code>status</code> as the customer status.</li>
          <li><code>createdBy</code> as the user who created the customer record.</li>
          <li><code>createdAt</code> as the timestamp when the customer was created.</li>
          <li><code>updatedAt</code> as the timestamp when the customer was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One customer can only be created by one user.</li>
          <li>One customer can have many car or policy records.</li>
          <li>One customer can have many quotations.</li>
          <li>One customer can have many invoices.</li>
          <li>One customer can have many payment records.</li>
          <li>One customer can have many renewal records.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>car_data</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated using the user ID and car sequence number.</li>
          <li><code>customerId</code> as the customer who owns the car or policy.</li>
          <li><code>carData.ownerName</code> as the vehicle owner name.</li>
          <li><code>carData.carBrand</code> as the car brand.</li>
          <li><code>carData.carModel</code> as the car model.</li>
          <li><code>carData.plateNumber</code> as the vehicle plate number.</li>
          <li><code>carData.chassisNumber</code> as the vehicle chassis number.</li>
          <li><code>carData.engineNumber</code> as the vehicle engine number.</li>
          <li><code>carData.startDate</code> as the insurance or policy start date.</li>
          <li><code>carData.dueDate</code> as the insurance or policy due date.</li>
          <li><code>carData.carPrice</code> as the insured vehicle price or TSI source value.</li>
          <li><code>carData.color</code> as the vehicle color.</li>
          <li><code>carData.year</code> as the vehicle production year.</li>
          <li><code>carData.insuranceProvider</code> as the selected insurance provider.</li>
          <li><code>carData.insuranceType</code> as the selected insurance type.</li>
          <li><code>carData.coverageExtensions</code> as additional coverage options.</li>
          <li><code>carPhotos</code> as an object containing vehicle photo URLs such as left side, right side, front, back, and dashboard.</li>
          <li><code>documentPhotos</code> as an object containing document photo URLs such as STNK, SIM, KTP, and policy document.</li>
          <li><code>status</code> as the car or policy status.</li>
          <li><code>notes</code> as additional notes about the car.</li>
          <li><code>createdBy</code> as the user who created the car record.</li>
          <li><code>createdAt</code> as the timestamp when the car was created.</li>
          <li><code>updatedAt</code> as the timestamp when the car was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One car can only belong to one customer.</li>
          <li>One car can only be created by one user.</li>
          <li>One car can have many quotation records through <code>policyId</code>.</li>
          <li>One car can have many invoice records through <code>carId</code>.</li>
          <li>One car can have many payment records through <code>policyId</code>.</li>
          <li>One car can have many renewal records through <code>policyId</code>.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>quotation_records</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, stored as the quotation document ID.</li>
          <li><code>customerId</code> as the customer related to the quotation.</li>
          <li><code>policyType</code> as the type of policy, for example car.</li>
          <li><code>policyId</code> as the related policy or car ID.</li>
          <li><code>renewalId</code> as the renewal record ID if the quotation is created from a renewal process.</li>
          <li><code>quotationNumber</code> as the displayed quotation number.</li>
          <li><code>tsi</code> as the total sum insured value.</li>
          <li><code>insuranceProvider</code> as the provider used in the quotation.</li>
          <li><code>insuranceType</code> as the type of insurance package.</li>
          <li><code>coverages</code> as an object containing coverage configuration, percentage, fixed amount flag, and free include flag.</li>
          <li><code>totalPremium</code> as the calculated total premium.</li>
          <li><code>userId</code> as the user related to the quotation.</li>
          <li><code>status</code> as the quotation status, such as Pending or Accepted.</li>
          <li><code>createdAt</code> as the timestamp when the quotation was created.</li>
          <li><code>updatedAt</code> as the timestamp when the quotation was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One quotation can only be created by one user.</li>
          <li>One quotation can only belong to one customer.</li>
          <li>One quotation can only refer to one policy or car.</li>
          <li>One quotation may belong to one renewal process.</li>
          <li>One accepted quotation can generate one invoice.</li>
          <li>One accepted quotation can generate one payment record.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>invoice_records</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated from the invoice sequence number, for example <code>inv-1</code>.</li>
          <li><code>invoiceNumber</code> as the displayed invoice number.</li>
          <li><code>customerId</code> as the customer billed by the invoice.</li>
          <li><code>customerName</code> as the customer name snapshot for the invoice.</li>
          <li><code>carId</code> as the related car or policy ID.</li>
          <li><code>plateNumber</code> as the vehicle plate number snapshot.</li>
          <li><code>quotationId</code> as the quotation that generated the invoice.</li>
          <li><code>renewalId</code> as the renewal record related to the invoice, if available.</li>
          <li><code>items</code> as the list of invoice line items.</li>
          <li><code>subTotal</code> as the subtotal amount before discount.</li>
          <li><code>discount</code> as the discount amount.</li>
          <li><code>grandTotal</code> as the final invoice total.</li>
          <li><code>issueDate</code> as the date when the invoice was issued.</li>
          <li><code>dueDate</code> as the payment due date of the invoice.</li>
          <li><code>status</code> as the invoice status, for example Unpaid or Paid.</li>
          <li><code>notes</code> as additional invoice notes.</li>
          <li><code>createdBy</code> as the user who created the invoice.</li>
          <li><code>createdAt</code> as the timestamp when the invoice was created.</li>
          <li><code>updatedAt</code> as the timestamp when the invoice was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One invoice can only be created by one user.</li>
          <li>One invoice can only belong to one customer.</li>
          <li>One invoice can refer to one car or policy.</li>
          <li>One invoice can be generated from one quotation.</li>
          <li>One invoice may be connected to one renewal process.</li>
          <li>One invoice can be paid through one or more payment records depending on business flow.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>payment_records</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated from the payment sequence number, for example <code>pay-1</code>.</li>
          <li><code>customerId</code> as the customer who makes the payment.</li>
          <li><code>policyType</code> as the related policy type, for example car.</li>
          <li><code>policyId</code> as the related policy or car ID.</li>
          <li><code>renewalId</code> as the renewal record related to the payment, if available.</li>
          <li><code>invoiceNumber</code> as the invoice document reference used by the backend.</li>
          <li><code>amount</code> as the payment amount.</li>
          <li><code>dueDate</code> as the due date of the payment.</li>
          <li><code>paidDate</code> as the date when payment was completed.</li>
          <li><code>paymentMethod</code> as the payment method used by the customer.</li>
          <li><code>status</code> as the payment status, for example Pending or Paid.</li>
          <li><code>proofUrl</code> as the uploaded proof of payment URL.</li>
          <li><code>notes</code> as additional payment notes.</li>
          <li><code>createdBy</code> as the user who created the payment record.</li>
          <li><code>createdAt</code> as the timestamp when the payment was created.</li>
          <li><code>updatedAt</code> as the timestamp when the payment was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One payment can only be created by one user.</li>
          <li>One payment can only belong to one customer.</li>
          <li>One payment can refer to one car or policy.</li>
          <li>One payment can refer to one invoice.</li>
          <li>One payment may be connected to one renewal process.</li>
          <li>One payment can have one kwitansi record as receipt.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>kwitansi_records</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated from the kwitansi sequence number, for example <code>kwt-1</code>.</li>
          <li><code>kwitansiNumber</code> as the displayed receipt number.</li>
          <li><code>paymentId</code> as the payment record connected to the receipt.</li>
          <li><code>invoiceData</code> as a snapshot object of invoice information used when the kwitansi is printed.</li>
          <li><code>issuedDate</code> as the date when the kwitansi was issued.</li>
          <li><code>printedBy</code> as the user who printed the kwitansi.</li>
          <li><code>printCount</code> as the number of times the kwitansi has been printed.</li>
          <li><code>createdAt</code> as the timestamp when the kwitansi was created.</li>
          <li><code>updatedAt</code> as the timestamp when the kwitansi was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One kwitansi can only be printed by one user.</li>
          <li>One kwitansi can only belong to one payment record.</li>
          <li>One payment can have one kwitansi as proof of receipt.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>renewal_records</strong></td>
      <td>
        <ol>
          <li><code>id</code> as primary key, generated from the renewal sequence number, for example <code>ren-1</code>.</li>
          <li><code>customerId</code> as the customer who renews the policy.</li>
          <li><code>policyType</code> as the type of policy being renewed, for example car.</li>
          <li><code>policyId</code> as the policy or car ID being renewed.</li>
          <li><code>paymentId</code> as the payment record connected to the renewal, if available.</li>
          <li><code>oldStartDate</code> as the previous policy start date.</li>
          <li><code>oldEndDate</code> as the previous policy end date.</li>
          <li><code>newStartDate</code> as the new policy start date.</li>
          <li><code>newEndDate</code> as the new policy end date.</li>
          <li><code>premium</code> as the renewal premium amount.</li>
          <li><code>status</code> as the renewal status, such as Pending, Approved, Completed, or Cancelled.</li>
          <li><code>notes</code> as additional renewal notes.</li>
          <li><code>completedAt</code> as the timestamp when the renewal was completed.</li>
          <li><code>createdBy</code> as the user who created the renewal record.</li>
          <li><code>createdAt</code> as the timestamp when the renewal was created.</li>
          <li><code>updatedAt</code> as the timestamp when the renewal was last updated.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One renewal can only be created by one user.</li>
          <li>One renewal can only belong to one customer.</li>
          <li>One renewal can only renew one policy or car.</li>
          <li>One renewal can generate many quotation options.</li>
          <li>One completed renewal may be connected to one invoice.</li>
          <li>One completed renewal may be connected to one payment record.</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td><strong>car_references</strong></td>
      <td>
        <ol>
          <li><code>brand</code> as primary key and Firestore document ID.</li>
          <li><code>_brandExists</code> as a flag to ensure the brand document exists.</li>
          <li>Dynamic model fields as available car models under the brand, stored with boolean values.</li>
          <li><code>models</code> as a logical representation of available model names when displayed by the application.</li>
        </ol>
      </td>
      <td>
        <ol>
          <li>One car reference brand can contain many car models.</li>
          <li>One car record can use one brand and one model from car references.</li>
          <li>Car references are used as master data to standardize car brand and model input.</li>
        </ol>
      </td>
    </tr>
  </tbody>
</table>
