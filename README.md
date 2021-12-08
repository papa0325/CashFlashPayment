# CashFlashPayment
## Оглавление 
* [Идентификация](#identification)
* [API](#api)
    * [Адрес](#address)
        * [Регистрация нового адреса](#get-apiaddress)
        * [Получить список существующих адресов](#get-apiaddresses-list)
        * [Информация по адресу](#get-apiaddress-info)
    * [Баланс](#balance)
        * [Получить текущий баланс](#get-apibalance)
    * [Вывод средств](#withdraw)
        * [Перевести средства на адрес](#get-apiwithdraw)
        * [Список переводов](#get-apiwithdraw-list)
    * [IPN](#ipn)
        * [Получить список IPN](#get-apiipn)
    * [Блок](#block)
        * [Получить текущий блок](#get-apiblock)
* [IPN](#ipn)
* [Статусы ответа](#response-http-status-code)

## Identification
В заголовке запроса ключ: "authorization", значение: "Basic [CLIENT_ID]:[PASSWORD]". Значение "[CLIENT_ID]:[PASSWORD]" должно быть сконвертировано в формат Base64. Это поле обязательно для всех запросов к платежному шлюзу. Также присутствует проверка на доступ с определенного IP.
Для некоторых особо важных запросов (например на вывод средств) необходимо в заголовке отправить поле с ключом "otp", значение - строка, актуальный сгенерированный 6-ти значный код, поддерживается "окно", индивидуально оговоренное заранее.
Сервис, в ответах на запросы и уведомлениях о поступлении средств также отправляет в заголовке в поле "authorization" свои идентификационные данные "Basic [SERVER_ID]:[PASSWORD]", где значение "[SERVER_ID]:[PASSWORD]" также сконвертированно в формат Base64. 

## API
### Address
#### [GET] /api/address

**Описание:** регистрация нового адреса

*PARAMS (R - required field, D - default value):*
* address: [string] (R) // адрес который будет указываться в memo (a-z,1-5 are allowed only. Length 12)
* currency: [string] (R) // символ валюты
* reserve: [bool] (D = false) // адрес для заявки или пополнение резервов

*RESPONSE [string]:*
```javascript
'qwertyuiop13'
```
#### [GET] /api/addresses-list

**Описание:** получение списка существующих адресов

*PARAMS (R - required field, D - default value):* 
* currency: [string] // символ валюты
* reserve: [bool] // адрес для заявки или пополнение резервов
* reverse: [bool] (D = false) // сортировка по дате создания, true - сначала новые, false - сначала старые
* limit: [int] (D = 10) // максимальное количество записей в ответе
* offset: [int] (D = 0) // отступ
* includeZeroBalance: [bool] (D = false) // включение в выборку аккаунтов с нулевым балансом

*RESPONSE [json]:*
```javascript
[
    {
        "isReserve": false,
        "balance": "0",
        "balance_pending": "0",
        "currency": "eos",
        "address": "qwertyuiop12",
        "tokens": []
    },
    {
        "isReserve": false,
        "balance": "0",
        "balance_pending": "0",
        "currency": "eos",
        "address": "qwertyuiop13",
        "tokens": []
    }
]
```
#### [GET] /api/address-info

**Описание:** получение информации по определенному адресу

*PARAMS (R - required field, D - default value):*
* currency: [string] (R) // символ валюты
* address: [string] (R) // адрес

*RESPONSE [json]:*
```javascript
{
    "isReserve": false,
    "balance": "0",
    "balance_pending": "0",
    "tx_in": [],
    "tx_out": [],
    "currency": "eos",
    "address": "qwertyuiop12",
    "tokens": [],
    "created": "2020-05-12T09:39:00.235Z",
    "updated": "2020-05-12T09:39:00.235Z"
}
```
### Balance
#### [GET] /api/balance

**Описание:** получение баланса по валюте / получение балансов по всем активным валютам

*PARAMS (R - required field, D - default value):* 
* currency: [string] // символ валюты

*RESPONSE [json]:*
```javascript
{
    current: '12345', 
    pending: '0'
}
```
### Withdraw
#### [GET] /api/withdraw

**Описание:** совершить перевод средств на адрес

*PARAMS (R - required field, D - default value):* 
* id: [string] // номер заявки
* amount: [string] // сумма для вывода, '0' - вывести всю возможную сумму по валюте (EOS - мин.единица - 1)
* to: [string] // адрес, куда совершить перевод
* from: [string] // адрес, с которого совершить перевод
* currency: [string] // символ валюты

*RESPONSE [json]:*
```javascript
[
  {
    tx_id: '186c81d4677e940666e9c7f088174895f88d599512059e48b6607cef8295c1f7',
    amount: '31'
  }
]

```
#### [GET] /api/withdraw-list

**Описание:** получить список совершенных ранее переводов

*PARAMS (R - required field, D - default value):*
* id: [string] // номер заявки
* to: [string] // адрес, куда был перевод
* currency: [string] // символ валюты
* reverse: [bool] (D = false) // сортировка по дате создания, true - сначала новые, false - сначала старые
* limit: [int] (D = 10) // максимальное количество записей в ответе
* offset: [int] (D = 0) // отступ

*RESPONSE [json]:*
```javascript
[{
    order_id: '12345', 
    currency: 'btc',
    to: '1dWQ6bQLQurJozCE4rPkfyy4QuAh11G7e', 
    amount_requested: '0', 
    amount_estimated: '11111', 
    amount_sent: '11111',
    currency_balance: {current: '0', pending: '0'}, 
    txs: [{
        tx_id: 'ab4bd97e89bf08c5dac7129850689980812bf1dd57ff2297ad537fcc97c8388c',
        amount: '11111',
        satoshiPerByte: '24',
        fee: '5400'
    }], 
    created: '2019-02-11T04:52:59.204Z'
}]
```
*Примечание: в поле "txs" всегда приходит массив, при корректной работе внутри всегда будет 1 объект (tx_id, amount, fee). Однако в случае отправки эфира, если не указан параметр "from" может быть ситуация, когда для отправки нужной суммы может потребоваться отправить несколько транзакций - в этом случае в массиве "txs" может содержаться несколько элементов.*
### IPN
#### [GET] /api/ipn

**Описание:** получить список IPN

*PARAMS (R - required field, D - default value):* 
* currency: [string] // символ валюты
* address: [string] // адрес
* reverse: [bool] (D = false) // сортировка по дате создания, true - сначала новые, false - сначала старые
* limit: [int] (D = 10) // максимальное количество записей в ответе
* offset: [int] (D = 0) // отступ

*RESPONSE [json]:*
```javascript
[{
    status: 0,
    address: '1dWQ6bQLQurJozCE4rPkfyy4QuAh11G7e',
    tx_id: '46fb8eea12509ce3eef71722b1e4fedf6e20bf4ba678deddc1e16d9c03bedabe' ,
    blockNumber: '562131',
    currency: 'btc',
    amount: '10509721',
    vout: 0,
    isSentNotify: true,
    attemptSendNotify: 1,
    isSentResult: false,
    attemptSendResult: 0,
    created: '2019-02-11T04:52:59.204Z', 
    updated: '2019-02-11T04:56:59.204Z'
}]
```
### Block
#### [GET] /api/block

**Описание:** получить номер последнего обработанного блока

*PARAMS (R - required field, D - default value):* 
* currency: [string] // символ валюты

*RESPONSE [string]:*
```javascript
'1500500'
```
## IPN (Instant Payment Notification)
Уведомления о платежах отправляются в стандартном сценарии 2 раза. Первый раз - когда транзакция попадает в сеть, второй - когда она подтверждается (набирает определенное количество блоков), либо когда отвергается сетью.
Уведомления отправляются стандартным HTTP [POST] запросом на заранее оговоренный URL. Удачной считается отправка, если клиент в ответе вернул статус 200 либо 202, в противном случае шлюз будет пытаться отправить уведомление о поступлении средств 3 раза - для новой транзакции, 5 раз - с результатом транзакции. При неудачной отправке следующая попытка будет не ранее чем через 2 минуты - для новой транзакции и 3 минуты - для уведомления с результатом. 

*REQUEST [json]:*
```javascript
[{
    currency: 'btc',
    address: '1dWQ6bQLQurJozCE4rPkfyy4QuAh11G7e',
    amount: '11111',
    tx_id: '46fb8eea12509ce3eef71722b1e4fedf6e20bf4ba678deddc1e16d9c03bedabe',
    status: '0'
}]
```
*Примечание: в поле 'status' содержится статус-код текущей транзакции, 0 - новая (неподтвержденная), 1 - успешная (подтвержденная), 2 - неудачная (отвергнута сетью). В поле 'amount' для ETH сумма всегда в wei, для BTC и альткоинов - сумма всегда в satoshi.* 

## Response HTTP status code
* **200** OK
* **400** invalid params
* **401** forbidden (identification)
* **402** forbidden (OTP)
* **410** currency is busy
* **415** order is already processed
* **420** too many requests
* **421** too many withdraw to the same address
* **430** route is not found or unavailable
* **450** insufficient funds
* **500** internal server error
* **550** sending transaction error