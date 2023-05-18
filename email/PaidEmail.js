function paidEmail(id, product){
    const {title, price,quantity} = product
    return (
        `
        Your Payment successful
        Your TXID ${id}
        Product Name: ${title}
        Price: $${price.toFixed(2)}
        Quantity: ${quantity}
        Thanks For Payment
        `
    )
};

function shippedEmail(id, product){
    const {title} = product
    return (
        `
        Your Order successfully shipped
        Your order ID:- ${id}
        Product Name: ${title}
        Thanks
        `
    )
};

module.exports = {paidEmail, shippedEmail}