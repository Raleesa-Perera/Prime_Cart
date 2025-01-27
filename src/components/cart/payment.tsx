"use client"

import React, { useContext, useEffect, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartContext } from '@/hooks/useCart';
import ViewCart from './ViewCart';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '../ui/toast';
import { useSession } from 'next-auth/react';
import UserDetails from '../profile/address';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';
import Checkout from '../Payment/payment';
 
type Address = {
  
  addressId: string;
  name: string;
  
  addrNo: string;
  addrStreet: string;
  addrLine1: string;
  addrLine2: string;
  addrTown: string;
  addrDistrict: string;
  addrProvince: string;
  postalCode: string;
  contactNo: string;
  isMainCity:number;
};

type PaymentProps = {
  // Add any props if needed
};

const Payment: React.FC<PaymentProps> = () => {
  const [selectedShipping, setSelectedShipping] = useState<'StorePickup' | 'Delivery'>('StorePickup');
  const [selectedPayment, setSelectedPayment] = useState<'credit' | 'CashOnDelivery'>('CashOnDelivery');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<number>(0);
  const cartContext = useContext(CartContext);
  const [deliveryFees,setDeliveryFees]=useState(0);
  const [address,setAddress]=useState(false);
  const totalPrice = Number(cartContext?.price) ?? 0;
  const [total, setTotal] = useState<number>(0);
  const session= useSession();
  const router=useRouter();
  const [isMainCity,setIsMainCity]=useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isCreditCardOpen, setIsCreditCardOpen] = useState(false);
  const [isPaymentGateOpen, setIsPaymentGateOpen] = useState(false);
 
  const [showDeliveryDate,setShowDeliveryDate]=useState(false);

    // Update delivery date if `isMainCity` changes
    useEffect(() => {
      setDeliveryDate(calculateDeliveryDate(isMainCity, cartContext?.products || []));
    }, [isMainCity, cartContext?.products]);
  
    function calculateDeliveryDate(isMainCity: number, products: any[]): string {
      const deliveryDate = new Date();
      const daysToAdd = isMainCity === 1 ? 5 : 7;
      const additionalDays = products.some(product => product.availableStock < 1) ? 3 : 0;
  console.log("additonal days",additionalDays)
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd + additionalDays);
  
      const year = deliveryDate.getFullYear();
      const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
      const day = String(deliveryDate.getDate()).padStart(2, '0');
  
      return `${year}-${month}-${day}`;
    }

  const shippingPrices = {
    StorePickup: 5.00,
    Delivery: 100.00,
  };
  

  const calculateTotal = () => {
    const shippingTotal = shippingPrices[selectedShipping];
    setDeliveryFees(shippingTotal)
    setTotal((shippingTotal || 0) + totalPrice);
  };

    const openAddressForm = () => {
      setAddress(prev => !prev);  // Toggle the address form
    };
  
    const onSubmit1 = async () => {
      const userId = session.data?.user?.id||null;
      const deliveryFee = deliveryFees;
      const deliveryMethod = selectedShipping;
      const totalAmount = total;
      const paymentMethod = selectedPayment;
      const estimatedDeliveryDate = deliveryDate;
    
      // if (!deliveryMethod || !totalAmount || !paymentMethod || !estimatedDeliveryDate || !deliveryAddress || !deliveryFee) {
      //   toast({
      //     variant: "destructive",
      //     title: "Uh oh! Something went wrong.",
      //     description: "Missing required parameters.",
      //     action: <ToastAction altText="Try again">Try again</ToastAction>,
      //   });
      //   return;
      // }


      if(!isPaymentGateOpen){
        return (
        toast({
          variant: "destructive",
          title: "Please Select Address",
          description: "There was a problem with your request.",
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        }))
      }
      console.log("trying..................")
    
      try {
       
        const apiUrl = userId ? '/api/order' : '/api/guestOrder';
        const body = userId
          ? { deliveryMethod, totalAmount, paymentMethod, estimatedDeliveryDate, addressId: deliveryAddress, deliveryFee, userId }
          : { deliveryMethod, totalAmount, paymentMethod, estimatedDeliveryDate, address: cartContext?.address[0], deliveryFee,orderProducts:cartContext?.products };
           console.log("unregistered user",body);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
    
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
    
        const responseBody = await response.json();
        console.log('Success:', responseBody);
        router.push("/orderSuccess")
       
          // Set to true if payment is successful
        
    
        // router.push("/order");
      } catch (error) {
        console.error('Error in onSubmit:', error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "There was a problem with your request.",
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        });
      }
    };
    

  useEffect(() => {
    calculateTotal();
  
  }, [selectedShipping, totalPrice]);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch(`/api/checkout/${session.data?.user?.id}`);
        if (!response.ok) throw new Error('Failed to fetch addresses');
        const data = await response.json();
        setAddresses(data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAddresses();
    // console.log("user" ,session.data?.user?.id)
  }, [openAddressForm,session.data?.user?.id]);

  return (
    <main className="flex flex-col items-center justify-center w-full">
      <div className="grid sm:px-10 lg:grid-cols-2 lg:px-20 xl:px-32">
        <div className="px-4 pt-8">
          <p className="text-xl font-medium">Order Summary</p>
          <p className="text-gray-400">Check your items and select a suitable shipping method.</p>
          <div className="space-y-4">
            {cartContext?.products?.map((product, key) => (
              // <ViewCart key={key} product={product} />
              <div className="flex gap-4 bg-white px-4 py-6 rounded-md shadow-[0_2px_12px_-3px_rgba(6,81,237,0.3)]">
              <div className="flex items-center gap-4 justify-normal">
                <div className="w-20 h-20 max-sm:w-24 max-sm:h-12 shrink-0">
                  <img src={product.imageUrl} className="object-contain w-full h-full" alt={product.availableStock} />
                </div>
        
                <div className="flex flex-col gap-4">
                  <div>
                  <h3 className="text-base font-bold text-gray-800">{product.productName}</h3>
                    <h3 className="text-base font-bold text-gray-800">{product.sku}</h3>
                    
                    <p className="flex items-center gap-2 mt-2 text-sm font-semibold text-gray-500">
                      Quantity <span className="inline-block w-5 h-5 rounded-md" style={{ backgroundColor: product.color }}> {product.quantity}</span>
                    </p>
                    <h3 className="mt-auto text-base text-gray-800"><span className='text-sm font-semibold text-gray-500'>Unit price :</span>Rs {product.price}</h3>
                    <p
  className={`text-base  ${
    product.availableStock > 0 ? 'text-green-600' : 'text-red-600'
  }`}
>
  {product.availableStock > 0 ? 'in stock' : 'Out of Stock'}
</p>
                  </div>
                </div>
              </div>
        
              <div className="flex flex-col ml-auto">
                
                <h3 className="mt-auto text-base font-bold text-gray-800"> Total   Rs {(Number(product.price) * product.quantity).toFixed(2)}</h3>
              </div>
            </div>
            ))}
          </div>
          <p className="mt-8 text-lg font-medium">Shipping Methods</p>
          <form className="grid gap-6 mt-5">
            {Object.entries(shippingPrices).map(([method, price]) => (
              <div className="relative" key={method}>
                <input
                  className="hidden peer"
                  id={`radio_${method}`}
                  type="radio"
                  name="shipping"
                  value={method}
                  checked={selectedShipping === method}
                  onChange={() => setSelectedShipping(method as 'StorePickup' | 'Delivery')}
                />
                <span className="box-content absolute block w-3 h-3 -translate-y-1/2 bg-white border-8 border-gray-300 rounded-full peer-checked:border-gray-700 right-4 top-1/2"></span>
                <label className="flex p-4 border border-gray-300 rounded-lg cursor-pointer select-none peer-checked:border-2 peer-checked:border-gray-700 peer-checked:bg-gray-50" htmlFor={`radio_${method}`}>
                  <img className="object-contain w-14" src={"/images/credit.jpg"} alt={`${method.charAt(0).toUpperCase() + method.slice(1)} `} />
                  <div className="ml-5">
                    <span className="mt-2 font-semibold">{`${method.charAt(0).toUpperCase() + method.slice(1)}  - $${price.toFixed(2)}`}</span>
                    {showDeliveryDate &&
                    <p className="text-sm font-bold leading-6 text-green-700 "> Estimated Delivery Date: {deliveryDate}</p>
                    }
                  </div>
                </label>
              </div>
            ))}
          </form>

          
        </div>

        <div className="px-4 pt-8">
          
          {address?<UserDetails/>:
          
          <div className="flex items-center justify-start gap-2 align-middle">
          <Select 
           onValueChange={(value) => {
            const selectedAddress = addresses.find((address) => address.addressId === value);
            setDeliveryAddress(parseInt(value));
            setIsPaymentGateOpen(true);
            setShowDeliveryDate(true);
            setIsMainCity(selectedAddress?.isMainCity || 0); // Default to 0 if isMainCity is undefined
          }}
          >

              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select Address" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Select Address</SelectLabel>


                  {session?.data?.user ? (
        // If user is logged in, map through addresses
        addresses.map((address) => (
          <SelectItem key={address.addressId} value={address.addressId}>
            <p>{`${address.name}`}</p>
            {address.addrNo}, {address.addrStreet}, {address.addrLine1}, {address.addrLine2}
            <br />
            {address.addrTown}, {address.addrDistrict}, {address.addrProvince}, {address.postalCode}, {address.contactNo}
          </SelectItem>
        ))
      ) : (
       
        cartContext?.address.map((address) => (
          <SelectItem key={address} value={address}>
            <p>{`${address.name}`}</p>
            {address.addrNo}, {address.addrStreet}, {address.addrLine1}, {address.addrLine2}
            <br />
            {address.addrTown}, {address.addrDistrict}, {address.addrProvince}, {address.postalCode}, hi {address.isMainCity}
          </SelectItem>
        ))
       
      )}
                </SelectGroup>
              </SelectContent>
            </Select>


            <div>
            {/* Button to open UserDetails in full screen */}
            <Button variant="outline" onClick={() => setIsUserDetailsOpen(true)}>
                Add Address
            </Button>

            {/* Full-screen UserDetails component */}
            {isUserDetailsOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                >
                    <div className="relative w-full h-full p-6 overflow-y-auto bg-white">
                        {/* Close button */}
                        <button
                            onClick={() => setIsUserDetailsOpen(false)}
                            className="absolute p-2 text-gray-500 top-4 right-4"
                        >
                            Close
                        </button>

                        {/* Full-screen UserDetails content */}
                        <UserDetails />
                    </div>
                </div>
            )}
        </div>


          </div>}
         
         {isPaymentGateOpen &&
         
         
          <div>
            
          <p className="text-xl font-medium">Payment Methods</p>
          <form className="grid gap-6 mt-5">
            <div className="relative " onClick={() => setIsCreditCardOpen(true)}>
              <input className="hidden peer" id="payment_1" type="radio" name="payment" value="credit" checked={selectedPayment === 'credit'} onChange={() => setSelectedPayment('credit')} />
              <span className="box-content absolute block w-3 h-3 -translate-y-1/2 bg-white border-8 border-gray-300 rounded-full peer-checked:border-gray-700 right-4 top-1/2"></span>
              <label className="flex p-4 border border-gray-300 rounded-lg cursor-pointer select-none peer-checked:border-2 peer-checked:border-gray-700 peer-checked:bg-gray-50" htmlFor="payment_1">
                <img className="object-contain w-14" src="/images/credit.jpg" alt="Credit Card Payment" />
                <div className="ml-5">
                  <span className="mt-2 font-semibold">Credit Card</span>
                  <p className="text-sm leading-6 text-slate-500">Pay securely using your credit card.</p>
                </div>
              </label>

              {isCreditCardOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                >
                    <div className="relative w-full h-full p-6 overflow-y-auto bg-white">
                        {/* Close button */}
                        <button
                            onClick={() => setIsCreditCardOpen(false)}
                            className="absolute p-2 text-gray-500 top-4 right-4"
                        >
                            Close
                        </button>

                      <Checkout onSubmit={onSubmit1}/>

                                
                    </div>
                </div>
            )}
            </div>
            <div className="relative">
              <input className="hidden peer" id="payment_2" type="radio" name="payment" value="CashOnDelivery" checked={selectedPayment === 'CashOnDelivery'} onChange={() => setSelectedPayment('CashOnDelivery')} />
              <span className="box-content absolute block w-3 h-3 -translate-y-1/2 bg-white border-8 border-gray-300 rounded-full peer-checked:border-gray-700 right-4 top-1/2"></span>
              <label className="flex p-4 border border-gray-300 rounded-lg cursor-pointer select-none peer-checked:border-2 peer-checked:border-gray-700 peer-checked:bg-gray-50">
                <img className="object-contain w-14" src="/images/paypal.jpg" alt="PayPal Payment" />
                <div className="ml-5">
                  <span className="mt-2 font-semibold">Cash On Delivery</span>
                  <p className="text-sm leading-6 text-slate-500">Pay using your PayPal account.</p>
                </div>
              </label>
            </div>
          </form>
          </div>
         }

<div className="bg-white rounded-md px-4 py-6 mt-10 h-max shadow-[0_2px_12px_-3px_rgba(6,81,237,0.3)]">
                    <ul className="space-y-4 text-gray-800">
                        <li className="flex flex-wrap gap-4 text-sm">Subtotal <span className="ml-auto font-bold">{totalPrice}</span></li>
                        <li className="flex flex-wrap gap-4 text-sm">Shipping <span className="ml-auto font-bold">{deliveryFees}</span></li>
                    
                        <hr className="border-gray-300" />
                        <li className="flex flex-wrap gap-4 text-sm font-bold">Total <span className="ml-auto"> {total}</span></li>
                    </ul>

                    <div className="mt-8 space-y-2">
                        <button onClick={onSubmit1}  type="submit" className="text-sm px-4 hover:scale-105 py-2.5 w-full font-semibold tracking-wide bg-gray-800 hover:bg-gray-900 text-white rounded-md">Place Order</button>
                        <button onClick={()=>router.push("/")} type="button" className="text-sm px-4 py-2.5 w-full font-semibold tracking-wide bg-transparent hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-md">Continue Shopping  </button>
                    </div>
            {/* <p className="mt-4 text-lg font-bold">Total: ${total}</p>
            <button type="button" onClick={onSubmit} className="px-4 py-2 mt-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600">
              Place Order
            </button> */}
            </div>
        </div>
      </div>
    </main>
  );
};

export default Payment;