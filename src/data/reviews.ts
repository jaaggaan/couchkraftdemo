export type StoreReview = {
  id: string
  name: string
  city: string
  rating: number
  text: string
}

export const floatingReviews: StoreReview[] = [
  { id: 'r1', name: 'Priya Menon', city: 'Bengaluru', rating: 5, text: 'Our Luma sofa arrived exactly as promised — warm, solid, and beautifully finished.' },
  { id: 'r2', name: 'Arjun Nair', city: 'Kochi', rating: 5, text: 'White-glove delivery was effortless. The Sheesham dining set feels heirloom-quality.' },
  { id: 'r3', name: 'Ananya Desai', city: 'Pune', rating: 5, text: 'Custom dimensions were spot on. The team kept us updated on WhatsApp throughout.' },
  { id: 'r4', name: 'Rohit Sharma', city: 'Gurugram', rating: 4, text: 'Lounge chairs are incredibly comfortable. Lead time was honest and worth the wait.' },
  { id: 'r5', name: 'Meera Iyer', city: 'Chennai', rating: 5, text: 'Fabric swatches at home made choosing easy. Craftsmanship shows in every seam.' },
  { id: 'r6', name: 'Vikram Patel', city: 'Ahmedabad', rating: 5, text: 'Commissioned a storage bench — precise joinery and a finish that ages gracefully.' },
  { id: 'r7', name: 'Sneha Reddy', city: 'Hyderabad', rating: 5, text: 'From design call to delivery, CouchKraft felt personal, not like a big-box store.' },
  { id: 'r8', name: 'Karan Malhotra', city: 'Chandigarh', rating: 5, text: 'The oak sideboard is the centrepiece of our living room. Stunning in natural light.' },
]