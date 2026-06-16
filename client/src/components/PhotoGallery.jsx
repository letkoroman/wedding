import './PhotoGallery.css';

const PHOTOS = [
  { src: '/images/photo2.jpg', alt: 'Míša a Roman na kole u moře při západu slunce' },
  { src: '/images/photo3.jpg', alt: 'Míša a Roman před sochou Krista Vykupitele v Riu de Janeiru' },
  { src: '/images/photo4.jpg', alt: 'Míša a Roman před mostem 25 de Abril v Lisabonu' }
];

export default function PhotoGallery() {
  return (
    <div className="gallery">
      {PHOTOS.map((photo) => (
        <img key={photo.src} src={photo.src} alt={photo.alt} className="gallery-photo" />
      ))}
    </div>
  );
}
