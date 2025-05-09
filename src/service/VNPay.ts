import moment from "moment";

const vnp_TmnCode = process.env.VNP_TMNCODE || "6KV33Z7O"; // Mã Website của bạn
const vnp_HashSecret =
  process.env.VNP_HASHSECRET || "HID072I1H7DJ6HO5O92JMV2WX2HMDQRD"; // Chuỗi bí mật
let vnp_Url: any =
  process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"; // URL thanh toán
const vnp_ReturnUrl =
  process.env.VNP_RETURNURL || "http://localhost:3000/success"; // URL trả về của bạn

export const createVNPayPaymentUrl = ({
  Id,
  amount,
  bankCode = "VNBANK",
  customerDetails,
  items,
  req,
}: {
  Id: string;
  amount: number;
  bankCode: string;
  customerDetails: any;
  items: any;
  req: any;
}) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");

  let ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  let tmnCode = vnp_TmnCode;
  let secretKey = vnp_HashSecret;
  let vnpUrl = vnp_Url;
  let returnUrl = vnp_ReturnUrl;

  let orderId = moment(date).format("DDHHmmss");

  let locale = "vn";
  if (locale === null || locale === "") {
    locale = "vn";
  }
  let currCode = "VND";
  let vnp_Params: any = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;
  if (bankCode !== null && bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  let querystring = require("qs");
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });

  return vnpUrl;
};

export function sortObject(obj: any) {
  let sorted: any = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}
