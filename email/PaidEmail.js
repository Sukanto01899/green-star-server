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


module.exports = {paidEmail}